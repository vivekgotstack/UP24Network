package com.up24.news.platform;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.transaction.TransactionAwareCacheManagerProxy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Duration;

@Configuration
@EnableCaching
class CacheConfiguration {
    @Bean CacheManager cacheManager(ObjectMapper json) {
        var caches=new CaffeineCacheManager("article-feed","article-discovery","article-detail");
        caches.setCaffeine(Caffeine.newBuilder().maximumWeight(8L * 1024 * 1024)
                .weigher((Object key,Object value) -> {
                    try { return Math.addExact(128,Math.multiplyExact(Math.addExact(json.writeValueAsBytes(key).length,json.writeValueAsBytes(value).length),2)); }
                    catch (Exception ignored) { return 8 * 1024 * 1024; }
                }).expireAfterWrite(Duration.ofSeconds(30)).recordStats());
        return new TransactionAwareCacheManagerProxy(caches);
    }
}
