package com.up24.news.media.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.retries.StandardRetryStrategy;
import software.amazon.awssdk.services.s3.S3Client;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(S3Settings.class)
@ConditionalOnProperty(name="up24.media.storage",havingValue="s3")
@Profile("!local-preview")
class S3Configuration {
    @Bean(destroyMethod="close") S3Client mediaS3Client(S3Settings settings,
            @Value("${up24.media.s3.access-key-id:}") String accessKey,
            @Value("${up24.media.s3.secret-access-key:}") String secretKey,
            @Value("${up24.media.s3.session-token:}") String sessionToken) {
        settings.validate();
        if(accessKey.isBlank()!=secretKey.isBlank()) throw new IllegalStateException("Set both AWS access credentials, or use the AWS credential provider chain.");
        AwsCredentialsProvider credentials=accessKey.isBlank()?DefaultCredentialsProvider.builder().build():
                StaticCredentialsProvider.create(sessionToken.isBlank()?AwsBasicCredentials.create(accessKey,secretKey):
                        AwsSessionCredentials.create(accessKey,secretKey,sessionToken));
        return S3Client.builder().region(Region.of(settings.region())).credentialsProvider(credentials)
                .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(3)).socketTimeout(Duration.ofSeconds(5)))
                .overrideConfiguration(config -> config.apiCallTimeout(Duration.ofSeconds(12)).apiCallAttemptTimeout(Duration.ofSeconds(6))
                        .retryStrategy(StandardRetryStrategy.builder().maxAttempts(2).build())).build();
    }
    @Bean S3BinaryStorage s3BinaryStorage(S3Client client,S3Settings settings) { return new S3BinaryStorage(client,settings); }
}
