package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

interface MediaStore {
    record Reservation(MediaLibrary.Asset asset,boolean inserted) {}
    record Deletion(String id,StorageLocation location) {}
    record TagChange(String id,StorageLocation location,boolean eligible,long version) {}
    Optional<MediaLibrary.Asset> find(String id);
    MediaLibrary.Page list(int page,int size);
    void lockQuota();
    Optional<StorageLocation> location(String id);
    Reservation reserve(MediaLibrary.Asset asset,UUID actor,long quotaBytes,StorageLocation location);
    List<Deletion> deletions(String id);
    List<Deletion> dueDeletions();
    void completedDeletion(Deletion deletion);
    void failedDeletion(Deletion deletion);
    boolean eligibility(String id,long version,boolean eligible);
    List<TagChange> dueTags();
    void appliedTag(TagChange change);
    void failedTag(TagChange change);
    void delete(String id);
}
