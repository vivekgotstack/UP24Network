package com.up24.news.media.internal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;

/** Rechecks ownership after commit so a concurrent re-upload cannot lose its file. */
@Service
class UnusedMediaCleanup {
    private final MediaStore media;
    private final BinaryStorage storage;
    UnusedMediaCleanup(MediaStore media,BinaryStorage storage) { this.media=media;this.storage=storage; }
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void removeIfUnreferenced(String id) {
        media.lockQuota();
        if(media.find(id).isPresent()) return;
        try { storage.delete(id); }
        catch(IOException exception) {
            System.getLogger(UnusedMediaCleanup.class.getName()).log(System.Logger.Level.WARNING,"Unused image cleanup will need retry: "+id);
        }
    }
}
