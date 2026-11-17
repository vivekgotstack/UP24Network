package com.up24.news.media.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.jobs.BackgroundJobs;
import com.up24.news.media.MediaLibrary;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"up24.media.storage=local","up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email="})
class MediaMigrationTest {
    private static final Path DIRECTORY=directory();
    @DynamicPropertySource static void directory(DynamicPropertyRegistry properties) { properties.add("up24.media.directory",DIRECTORY::toString); }
    private static Path directory() {
        try { return Files.createTempDirectory("up24-image-migration-"); }
        catch(IOException exception) { throw new IllegalStateException(exception); }
    }
    @Autowired MediaLibrary library;
    @Autowired MediaMigrationService migration;
    @Autowired MediaStore media;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PlatformTransactionManager manager;
    @MockitoBean S3BinaryStorage cloud;
    @MockitoBean BackgroundJobs jobs;
    private final List<UUID> jobIds=new ArrayList<>();
    private UUID actor,article;
    private MediaLibrary.Asset asset;
    @BeforeEach void prepare() throws Exception {
        var settings=mock(S3Settings.class);
        when(settings.bucket()).thenReturn("migration-test-bucket");when(settings.prefix()).thenReturn("up24/published/images/");
        when(cloud.settings()).thenReturn(settings);
        when(cloud.target(anyString())).thenAnswer(call->new StorageLocation("S3","migration-test-bucket","up24/published/images/"+call.getArgument(0)+".webp"));
        when(jobs.submit(anyString(),any(),anyString(),any(),any())).thenAnswer(call->{
            var id=UUID.randomUUID();jobIds.add(id);
            jdbc.update("INSERT INTO background_job(id,dedup_key,job_type,lane,state,expires_at) VALUES (?,?,'media.image-migration.v1','MEDIA','RUNNING',?)",id,call.getArgument(2),Timestamp.from(call.getArgument(4)));
            return id;
        });
        when(jobs.status(any())).thenAnswer(call->new BackgroundJobs.Status(call.getArgument(0),"media.image-migration.v1","RUNNING",1,null));
        actor=UUID.randomUUID();
        jdbc.update("INSERT INTO identity_account(id,email,display_name,password_hash,role) VALUES (?,?,?,?, 'REPORTER')",actor,"migration-"+actor+"@fixture.test","Migration fixture","{noop}fixture-only");
        byte[] bytes;
        try(var input=new ClassPathResource("media/red.webp").getInputStream()) { bytes=input.readAllBytes(); }
        asset=library.upload("migration-fixture.webp",bytes,bytes.length,actor);
    }
    @AfterEach void cleanup() throws Exception {
        if(article!=null) jdbc.update("DELETE FROM article_record WHERE id=?",article);
        if(asset!=null) {
            jdbc.update("DELETE FROM media_copy_reservation WHERE asset_id=?",asset.id());
            jdbc.update("DELETE FROM media_pending_deletion WHERE asset_id=?",asset.id());
            jdbc.update("DELETE FROM media_asset WHERE id=? AND uploaded_by=?",asset.id(),actor);
            Files.deleteIfExists(DIRECTORY.resolve(asset.id()+".webp"));
        }
        for(var id:jobIds) {
            jdbc.update("UPDATE media_retention_policy SET migration_run_id=NULL,migration_job_id=NULL,migration_started_at=NULL,migration_completed_at=NULL,migration_moved=0,migration_error=NULL,migration_bucket=NULL,migration_prefix=NULL WHERE migration_job_id=?",id);
            jdbc.update("DELETE FROM background_job WHERE id=?",id);
        }
        jdbc.update("DELETE FROM identity_account WHERE id=?",actor);
    }
    private UUID runId() { return jdbc.queryForObject("SELECT migration_run_id FROM media_retention_policy WHERE id=1",UUID.class); }
    @Test void verifiedCopyKeepsPublicUrlsAndReferencesAndRetainsLocalBytesUntilDeferredCleanup() throws Exception {
        new TransactionTemplate(manager).executeWithoutResult(status->{media.lockQuota();media.eligibility(asset.id(),asset.version(),false);});
        article=UUID.randomUUID();
        jdbc.update("INSERT INTO article_record(id,slug,title,summary,category,author,image) VALUES (?,?, 'Migration report','Summary','India','Desk',?)",article,"migration-"+article,asset.url());
        doAnswer(call->{assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();return null;})
                .when(cloud).put(any(StorageLocation.class),any(byte[].class));
        var started=migration.start();
        migration.execute(started.jobId(),json.valueToTree(java.util.Map.of("runId",runId())));
        var relocated=library.find(asset.id()).orElseThrow();
        assertThat(relocated.url()).isEqualTo(asset.url());assertThat(relocated.storageBackend()).isEqualTo("S3");
        assertThat(relocated.archiveEligible()).isFalse();assertThat(relocated.retentionSyncPending()).isFalse();
        verify(cloud).eligibility(any(StorageLocation.class),eq(false));
        assertThat(Files.exists(DIRECTORY.resolve(asset.id()+".webp"))).isTrue();
        assertThat(media.deletions(asset.id())).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT next_attempt_at>CURRENT_TIMESTAMP FROM media_pending_deletion WHERE asset_id=?",Boolean.class,asset.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM media_copy_reservation WHERE asset_id=?",Long.class,asset.id())).isZero();
        assertThat(migration.status().state()).isEqualTo("COMPLETED");assertThat(migration.status().moved()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT image FROM article_record WHERE id=?",String.class,article)).isEqualTo(asset.url());
    }
    @Test void aConcurrentEditPreventsCutoverAndQueuesOnlyTheUnreferencedCloudCopy() throws Exception {
        doAnswer(call->{jdbc.update("UPDATE media_asset SET version=version+1 WHERE id=?",asset.id());return null;})
                .when(cloud).put(any(StorageLocation.class),any(byte[].class));
        var started=migration.start();
        migration.execute(started.jobId(),json.valueToTree(java.util.Map.of("runId",runId())));
        assertThat(library.find(asset.id()).orElseThrow().storageBackend()).isEqualTo("LOCAL");
        assertThat(media.deletions(asset.id())).singleElement().satisfies(deletion->assertThat(deletion.location().backend()).isEqualTo("S3"));
        assertThat(Files.exists(DIRECTORY.resolve(asset.id()+".webp"))).isTrue();
        assertThat(migration.status().moved()).isZero();assertThat(migration.status().remaining()).isEqualTo(1);
    }
}
