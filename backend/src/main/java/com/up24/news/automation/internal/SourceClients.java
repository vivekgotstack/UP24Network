package com.up24.news.automation.internal;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import java.net.http.HttpClient;
import java.time.Duration;

final class SourceClients {
    private SourceClients() {}
    static RestClient create(RestClient.Builder builder, String baseUrl) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        return builder.clone().requestFactory(factory).baseUrl(baseUrl)
                .defaultHeader("User-Agent", "UP24Network/0.1 (+https://www.up24network.com)").build();
    }
}
