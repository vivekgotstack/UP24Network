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
        var active=media.location(id);
        for(var deletion:media.deletions(id)) {
            if(active.filter(deletion.location()::equals).isPresent()) { media.completedDeletion(deletion);continue; }
            try { storage.delete(deletion.location()); media.completedDeletion(deletion); }
            catch(IOException|RuntimeException exception) {
                media.failedDeletion(deletion);
                System.getLogger(UnusedMediaCleanup.class.getName()).log(System.Logger.Level.WARNING,"Unused media removal is queued for retry.");
            }
        }
    }
}
