package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcMediaStore implements MediaStore {
    private static final RowMapper<MediaLibrary.Asset> ASSET=(row,index) -> new MediaLibrary.Asset(row.getString("id"),
            "/media/"+row.getString("id")+".webp",row.getString("original_name"),row.getInt("bytes"),row.getInt("original_bytes"),
            row.getInt("width"),row.getInt("height"),row.getTimestamp("created_at").toInstant());
    private final JdbcTemplate jdbc;
    JdbcMediaStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public Optional<MediaLibrary.Asset> find(String id) {
        return jdbc.query("SELECT * FROM media_asset WHERE id=?",ASSET,id).stream().findFirst();
    }
    @Override public MediaLibrary.Page list(int page,int size) {
        long total=jdbc.queryForObject("SELECT count(*) FROM media_asset",Long.class);
        long bytes=jdbc.queryForObject("SELECT COALESCE(sum(bytes),0) FROM media_asset",Long.class);
        int pages=Math.max(1,(int)Math.ceil((double)total/size));
        int current=Math.min(page,pages);
        return new MediaLibrary.Page(jdbc.query("SELECT * FROM media_asset ORDER BY created_at DESC,id LIMIT ? OFFSET ?",ASSET,size,(current-1)*size),total,current,size,pages,bytes);
    }
    @Override public void lockQuota() {
        jdbc.execute("SELECT pg_advisory_xact_lock(8524,1301)");
    }
    @Override public Reservation reserve(MediaLibrary.Asset asset,UUID actor,long quotaBytes) {
        lockQuota();
        var existing=find(asset.id());
        if(existing.isPresent()) return new Reservation(existing.get(),false);
        long storedBytes=jdbc.queryForObject("SELECT COALESCE(sum(bytes),0) FROM media_asset",Long.class);
        if(asset.bytes()>quotaBytes || storedBytes>quotaBytes-asset.bytes())
            throw new MediaProblem(MediaProblem.Reason.QUOTA,"The media storage allowance is full. Remove unused photographs or increase the server storage allowance before uploading new images.");
        jdbc.update("INSERT INTO media_asset(id,original_name,bytes,original_bytes,width,height,uploaded_by) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
                asset.id(),asset.name(),asset.bytes(),asset.originalBytes(),asset.width(),asset.height(),actor);
        return new Reservation(find(asset.id()).orElseThrow(),true);
    }
    @Override public void delete(String id) { jdbc.update("DELETE FROM media_asset WHERE id=?",id); }
}
