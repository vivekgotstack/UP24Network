package com.up24.news.media;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MediaLibrary {
    record Asset(String id,String url,String name,int bytes,int originalBytes,int width,int height,Instant createdAt,
                 String storageBackend,boolean archiveEligible,long version,boolean retentionSyncPending) {
        public Asset(String id,String url,String name,int bytes,int originalBytes,int width,int height,Instant createdAt) {
            this(id,url,name,bytes,originalBytes,width,height,createdAt,"LOCAL",true,0,false);
        }
    }
    record Page(List<Asset> items,long total,int page,int size,int pages,long storedBytes,long quotaBytes) {
        public Page(List<Asset> items,long total,int page,int size,int pages,long storedBytes) {
            this(items,total,page,size,pages,storedBytes,0);
        }
    }
    Page list(int page,int size);
    Optional<Asset> find(String id);
    Asset upload(String name,byte[] webp,int originalBytes,UUID actor);
    void remove(String id);
}
