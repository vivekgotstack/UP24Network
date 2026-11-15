package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import java.util.Optional;
import java.util.UUID;

interface MediaStore {
    Optional<MediaLibrary.Asset> find(String id);
    MediaLibrary.Page list(int page,int size);
    void insert(MediaLibrary.Asset asset,UUID actor);
    void delete(String id);
}
