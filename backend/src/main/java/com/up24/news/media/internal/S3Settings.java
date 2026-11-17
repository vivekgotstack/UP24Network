package com.up24.news.media.internal;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.net.URI;

@ConfigurationProperties("up24.media.s3")
record S3Settings(String bucket,String region,String prefix,String cdnUrl,String videoPrefix,String stagingPrefix) {
    S3Settings(String bucket,String region,String prefix,String cdnUrl) { this(bucket,region,prefix,cdnUrl,"up24/published/videos/","up24/private/videos/"); }
    S3Settings {
        if(videoPrefix==null || videoPrefix.isBlank()) videoPrefix="up24/published/videos/";
        if(stagingPrefix==null || stagingPrefix.isBlank()) stagingPrefix="up24/private/videos/";
    }
    void validate() {
        if(bucket==null || !bucket.matches("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]") || bucket.contains(".."))
            throw new IllegalStateException("Set UP24_S3_BUCKET to your private media bucket.");
        if(region==null || !region.matches("[a-z]{2}(-[a-z]+)+-[0-9]")) throw new IllegalStateException("Set a valid AWS_REGION.");
        if(prefix==null || !prefix.matches("[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*/") || prefix.length()>200)
            throw new IllegalStateException("UP24_S3_PREFIX must be a scoped media prefix ending in /.");
        for(String value:new String[]{videoPrefix,stagingPrefix}) if(!value.matches("[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*/") || value.length()>200)
            throw new IllegalStateException("Use scoped video prefixes ending in /.");
        if(videoPrefix.startsWith(stagingPrefix) || stagingPrefix.startsWith(videoPrefix) || prefix.startsWith(stagingPrefix) || stagingPrefix.startsWith(prefix))
            throw new IllegalStateException("Private video originals must use a separate prefix from published media.");
        try {
            var uri=URI.create(cdnUrl==null?"":cdnUrl);
            if(!"https".equals(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null
                    || uri.getFragment()!=null || uri.getPort()!=-1 || !uri.getPath().matches("/?")) throw new IllegalArgumentException();
        } catch(IllegalArgumentException exception) { throw new IllegalStateException("Set UP24_MEDIA_CDN_URL to your HTTPS CloudFront/custom media origin."); }
    }
    URI address(String objectKey) { return URI.create(cdnUrl.replaceAll("/$","")+"/"+objectKey); }
}
