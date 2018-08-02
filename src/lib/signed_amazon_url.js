/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*global escape: true */
const AWS = require('aws-sdk');
const crypto = require('crypto');
const assert = require('assert');
const strftime = require('strftime').timezone(0);

// to move to a conf file
const algorithm = 'AWS4-HMAC-SHA256';
const expiration = 86400;

module.exports = function (s3, CF) {

    const cloudfront_signer = new AWS.CloudFront.Signer(CF.keyPairId, CF.privateKey);

    function uriencode (string) {
        var output = encodeURIComponent(string);
        output = output.replace(/[^A-Za-z0-9_.~\-%]+/g, escape);
        output = output.replace(/;/g, "%3B");

        // AWS percent-encodes some extra non-standard characters in a URI
        output = output.replace(/[*]/g, function(ch) {
            return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
        });

        return output;
    }

    function hmac (key, string, encoding) {
        return crypto.createHmac('sha256', key).update(string, 'utf8').digest(encoding);
    }

    function hmacSHA256 (signed_key, string) {
        return require('crypto').createHmac('sha256', new Buffer(signed_key, 'hex')).update(string).digest('hex');
    }

    function sha256 (string) {
        return require('crypto').createHash('sha256').update(string).digest('hex');
    }

    function amzDate (request_date) {
        return strftime("%Y%m%d", request_date);
    }

    function amzDateTime (request_date) {
        return strftime('%Y%m%dT%H%M%SZ', request_date);
    }

    function sort_obj_keys (obj) {
        return Object.keys(obj).sort();
    }

    function get_credential_scope (request_date) {
        return [
            amzDate(request_date),
            s3.AWS_REGION,
            's3',
            'aws4_request'
        ].join('/');
    }

    function get_credential_header (credential_scope) {
        return uriencode([s3.AWS_ACCESS_KEY, credential_scope].join('/'));
    }

    function get_signed_key (request_date) {
        let time = request_date.toISOString().replace(/[:\-]|\.\d{3}/g, '');
        time = time.substr(0, 8);
        const date = hmac('AWS4' + s3.AWS_SECRET, time);
        const region = hmac(date, s3.AWS_REGION);
        const service = hmac(region, "s3");
        const credentials = hmac(service, 'aws4_request', "hex");
        return credentials;
    }

    function get_string_to_sign (canonical_request, request_date) {
        const amz_time = amzDateTime(request_date);
        const credential_scope = get_credential_scope(request_date);
        const hashed_canonical_request = sha256(canonical_request);

        return [
            algorithm,
            amz_time,
            credential_scope,
            hashed_canonical_request
        ].join('\n');
    }

    function get_host () {
        return s3.BUCKET + '.s3.amazonaws.com';
    }

    function get_canonical_uri (hash) {
        return "/" + uriencode(hash).replace(/%2F/g, "/");
    }

    function get_canonical_query (queries) {
        return sort_obj_keys(queries)
            .map(query_key => uriencode(query_key) + "=" + queries[query_key])
            .join("&");
    }

    function get_canonical_headers (headers) {
        let canonical_string = sort_obj_keys(headers)
            .map(header_key => header_key.toLowerCase() + ":" + headers[header_key].trim())
            .join("\n");
        canonical_string += "\n";
        return canonical_string;
    }

    function get_signed_headers (headers) {
        return Object.keys(headers)
            .map(header_key => header_key.toLowerCase())
            .sort()
            .join(';');
    }

    function get_canonical_request (hash, method, query_parameters, headers, canonical_query_string) {
        const canonical_uri = get_canonical_uri(hash);
        const canonical_headers = get_canonical_headers(headers);
        const signed_headers = get_signed_headers(headers);
        const request_payload = 'UNSIGNED-PAYLOAD';

        const canonical_array = [
            method,
            canonical_uri,
            canonical_query_string,
            canonical_headers,
            signed_headers,
            request_payload
        ];

        return canonical_array.join('\n');
    }

    function sign_amazon (input) {
        assert(s3, 'Missing AWS S3 configuration');
        assert(s3.AWS_SECRET, 'Missing AWS S3 configuration (AWS_SECRET)');
        assert(s3.AWS_ACCESS_KEY, 'Missing AWS S3 configuration (AWS_ACCESS_KEY)');
        assert(s3.BUCKET, 'Missing AWS S3 configuration (BUCKET)');
        assert(s3.AWS_REGION, 'Missing AWS S3 configuration (AWS_REGION)');

        const headers = input.headers;
        headers.host = get_host();
        const request_date = new Date();
        const amz_date = uriencode(amzDateTime(request_date));
        const credential_scope = get_credential_scope(request_date);
        const credential_header = get_credential_header(credential_scope);
        const signed_headers = uriencode(get_signed_headers(headers));

        const query_parameters = {
            'X-Amz-Date': amz_date,
            'X-Amz-Algorithm': algorithm,
            'X-Amz-Expires': expiration,
            'X-Amz-Credential': credential_header,
            'X-Amz-SignedHeaders': signed_headers
        };

        Object.assign(query_parameters, input.queries);

        const canonical_query_string = get_canonical_query(query_parameters);
        const canonical_request = get_canonical_request(input.hash, input.method, query_parameters, headers, canonical_query_string);
        const signed_key = get_signed_key(request_date);
        const string_to_sign = get_string_to_sign(canonical_request, request_date);
        const signature = hmacSHA256(signed_key, string_to_sign);

        query_parameters['X-Amz-Signature'] = signature;
        const new_canonical_query_string = get_canonical_query(query_parameters);
        const url = "https://" + headers.host + "/" + input.hash + "?" + new_canonical_query_string;
        return url;
    }

    function sign_CF(input) {
        const url =  CF.origin + input.hash;
        const options = {
            url: url,
            expires: Math.floor(new Date().getTime() /1000) + CF.expires
        };
        return cloudfront_signer.getSignedUrl(options);
    }

    return input => {
        if (input.method === 'GET' && input.id === 'download') {
            return sign_CF(input);
        } else {
            return sign_amazon(input);
        }
    };

};
