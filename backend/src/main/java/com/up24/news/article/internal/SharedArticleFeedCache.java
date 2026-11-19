package com.up24.news.article.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.ArticleView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;

@Component
class SharedArticleFeedCache {
    private static final Logger log = LoggerFactory.getLogger(SharedArticleFeedCache.class);
    private static final List<String> KEYS = List.of("up24:article-feed:v1", "up24:article-feed:v1:generation");
    private static final TypeReference<List<ArticleView>> FEED_TYPE = new TypeReference<>() {};
    // A read that started before an editorial change cannot put its result back after invalidation.
    private static final RedisScript<Long> STORE = RedisScript.of("""
            if (redis.call('GET', KEYS[2]) or '') == ARGV[1] then
              redis.call('SET', KEYS[1], ARGV[2], 'EX', 30)
              return 1
            end
            return 0
            """, Long.class);
    private static final RedisScript<Long> INVALIDATE = RedisScript.of("""
            redis.call('SET', KEYS[2], ARGV[1])
            return redis.call('DEL', KEYS[1])
            """, Long.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper json;
    private final boolean enabled;

    SharedArticleFeedCache(StringRedisTemplate redis, ObjectMapper json,
                           @Value("${up24.cache.redis-feed-enabled:false}") boolean enabled) {
        this.redis = redis;
        this.json = json;
        this.enabled = enabled;
    }

    List<ArticleView> read(Supplier<List<ArticleView>> load) {
        if (!enabled) return load.get();

        String generation;
        try {
            var entry = redis.opsForValue().multiGet(KEYS);
            if (entry == null) return load.get();
            if (entry.getFirst() != null) return json.readValue(entry.getFirst(), FEED_TYPE);
            generation = Objects.toString(entry.get(1), "");
        } catch (DataAccessException | JsonProcessingException failure) {
            log.debug("Shared article feed cache read failed; reading from PostgreSQL", failure);
            return load.get();
        }

        var feed = load.get();
        try {
            redis.execute(STORE, KEYS, generation, json.writeValueAsString(feed));
        } catch (DataAccessException | JsonProcessingException failure) {
            log.debug("Shared article feed cache write failed", failure);
        }
        return feed;
    }

    void invalidate() {
        if (!enabled) return;
        try {
            redis.execute(INVALIDATE, KEYS, UUID.randomUUID().toString());
        } catch (DataAccessException failure) {
            log.debug("Shared article feed cache invalidation failed; entry expires automatically", failure);
        }
    }
}
