package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import java.util.Optional;
import java.util.UUID;

interface MediaStore {
    record Reservation(MediaLibrary.Asset asset,boolean inserted) {}
    Optional<MediaLibrary.Asset> find(String id);
    MediaLibrary.Page list(int page,int size);
    void lockQuota();
    Reservation reserve(MediaLibrary.Asset asset,UUID actor,long quotaBytes);
    void delete(String id);
}
