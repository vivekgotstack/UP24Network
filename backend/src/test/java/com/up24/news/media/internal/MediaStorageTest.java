package com.up24.news.media.internal;

import com.up24.news.article.ArticleMediaUsage;
import com.up24.news.identity.Access;
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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email="})
class MediaStorageTest {
    private static final Path DIRECTORY=temporaryDirectory();
    @DynamicPropertySource static void storage(DynamicPropertyRegistry properties) {
        properties.add("up24.media.directory",DIRECTORY::toString);
    }
    private static Path temporaryDirectory() {
        try { return Files.createTempDirectory("up24-media-test-"); }
        catch(IOException exception) { throw new IllegalStateException(exception); }
    }
    @Autowired MediaStore store;
    @Autowired BinaryStorage files;
    @Autowired UnusedMediaCleanup cleanup;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    private TransactionTemplate tx;
    private UUID actor;
    private byte[] red;
    private byte[] blue;
    private long baseline;
    private final ArticleMediaUsage usage=mock(ArticleMediaUsage.class);
    private final List<String> fixtureIds=new ArrayList<>();

    @BeforeEach void prepare() throws Exception {
        tx=new TransactionTemplate(transactions);
        actor=UUID.randomUUID();
        jdbc.update("INSERT INTO identity_account(id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)",
                actor,"media-"+actor+"@storage.test","Media fixture","{noop}not-used-for-login","REPORTER");
        red=fixture("red"); blue=fixture("blue");
        fixtureIds.add(hash(red)); fixtureIds.add(hash(blue));
        assertThat(fixtureIds).allMatch(id -> store.find(id).isEmpty());
        baseline=store.list(1,1).storedBytes();
    }
    private byte[] fixture(String name) throws IOException {
        try(var input=new ClassPathResource("media/"+name+".webp").getInputStream()) { return input.readAllBytes(); }
    }
    private String hash(byte[] value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));
    }
    private MediaService service(long quota) { return new MediaService(store,files,usage,Clock.systemUTC(),quota,cleanup); }
    @AfterEach void clean() throws IOException {
        for(String id:fixtureIds) {
            jdbc.update("DELETE FROM media_asset WHERE id=? AND uploaded_by=?",id,actor);
            if(store.find(id).isEmpty()) files.delete(files.target(id));
            jdbc.update("DELETE FROM media_pending_deletion WHERE asset_id=?",id);
        }
        jdbc.update("DELETE FROM identity_account WHERE id=?",actor);
        fixtureIds.clear();
    }

    @Test void concurrentUploadsCannotExceedQuotaAndAnIdenticalUploadDoesNotChargeAgain() throws Exception {
        long quota=baseline+Math.max(red.length,blue.length);
        var media=service(quota);
        var start=new CountDownLatch(1);
        var results=new ArrayList<String>();
        try(var workers=Executors.newVirtualThreadPerTaskExecutor()) {
            var futures=List.of(red,blue).stream().map(bytes -> workers.submit(() -> {
                start.await();
                try { return tx.execute(status -> media.upload("quota.webp",bytes,1000,actor)).id(); }
                catch(MediaProblem problem) { if(problem.reason==MediaProblem.Reason.QUOTA) return "quota"; throw problem; }
            })).toList();
            start.countDown();
            for(var future:futures) results.add(future.get(15,TimeUnit.SECONDS));
        }
        assertThat(results).filteredOn(value -> value.equals("quota")).hasSize(1);
        String accepted=results.stream().filter(value -> !value.equals("quota")).findFirst().orElseThrow();
        byte[] identical=accepted.equals(hash(red))?red:blue;
        var duplicate=tx.execute(status -> media.upload("renamed.webp",identical,2000,actor));
        assertThat(duplicate.id()).isEqualTo(accepted);
        assertThat(duplicate.name()).isEqualTo("quota.webp");
        assertThat(duplicate.width()).isEqualTo(3);
        assertThat(duplicate.height()).isEqualTo(2);
        assertThat(media.list(1,24).storedBytes()).isEqualTo(baseline+identical.length).isLessThanOrEqualTo(quota);
        assertThat(media.list(1,24).quotaBytes()).isEqualTo(quota);
        try(var entries=Files.list(DIRECTORY)) { assertThat(entries.filter(path -> path.toString().endsWith(".webp")).count()).isEqualTo(1); }
    }

    @Test void referencedImagesAreProtectedAndUnreferencedFilesAreRemovedOnlyAfterCommit() throws Exception {
        var media=service(baseline+red.length);
        var asset=tx.execute(status -> media.upload("report.webp",red,1000,actor));
        var mvc=MockMvcBuilders.standaloneSetup(new MediaController(media,files,mock(Access.class),store)).build();
        String url=asset.url(); String etag="\""+asset.id()+"\"";
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(header().string("ETag",etag));
        mvc.perform(get(url).header("If-None-Match",etag)).andExpect(status().isNotModified()).andExpect(content().string(""));
        when(usage.inUse(url)).thenReturn(true);
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> media.remove(asset.id())))
                .isInstanceOfSatisfying(MediaProblem.class,problem -> assertThat(problem.reason).isEqualTo(MediaProblem.Reason.IN_USE));
        assertThat(files.delivery(files.target(asset.id())).file()).exists();
        assertThat(store.find(asset.id())).isPresent();
        when(usage.inUse(url)).thenReturn(false);
        tx.executeWithoutResult(status -> {
            media.remove(asset.id());
            assertThat(files.delivery(files.target(asset.id())).file()).exists();
            assertThat(store.find(asset.id())).isEmpty();
        });
        assertThat(files.delivery(files.target(asset.id())).file()).doesNotExist();
        assertThat(media.list(1,24).storedBytes()).isEqualTo(baseline);
        mvc.perform(get(url).header("If-None-Match",etag)).andExpect(status().isNotFound());
    }
}
