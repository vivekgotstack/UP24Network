package com.up24.news.media;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MediaLibrary {
    record Asset(String id,String url,String name,int bytes,int originalBytes,int width,int height,Instant createdAt) {}
    record Page(List<Asset> items,long total,int page,int size,int pages,long storedBytes) {}
    Page list(int page,int size);
    Optional<Asset> find(String id);
    Asset upload(String name,byte[] webp,int originalBytes,UUID actor);
    void remove(String id);
}
