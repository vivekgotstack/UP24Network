package com.up24.news.publication.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.publication.PublicationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"up24.automation.scheduling-enabled=false", "up24.bootstrap.admin-email="})
@AutoConfigureMockMvc
@Transactional
class CorrespondenceInboxTest {
    @Autowired MockMvc mvc;
    @Autowired CorrespondenceInbox inbox;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    void receiptMatchesThePrivateCaseAndRetentionRespectsItsOpenAndPreservedStates() throws Exception {
        var response = mvc.perform(post("/api/publication/contact").with(csrf())
                        .contentType("application/json")
                        .content("""
                                {"topic":"COMPLAINT","name":"Reader","email":"reader@example.test",
                                 "subject":"Editorial review","message":"Please verify this report."}
                                """))
                .andExpect(status().isCreated()).andReturn().getResponse();
        UUID reference = UUID.fromString(json.readTree(response.getContentAsString()).get("reference").asText());
        mvc.perform(get("/api/admin/publication/inbox").param("reference", reference.toString()))
                .andExpect(status().isUnauthorized());

        var open = inbox.list(true, CorrespondenceInbox.Topic.COMPLAINT, reference, 1).items().getFirst();
        assertThat(open.decisionDueAt()).isEqualTo(open.receivedAt().plus(15, ChronoUnit.DAYS));
        assertThatThrownBy(() -> inbox.delete(reference, open.version())).isInstanceOf(PublicationException.class);

        jdbc.update("UPDATE publication_correspondence SET received_at=now()-interval '400 days' WHERE id=?", reference);
        inbox.expire();
        assertThat(inbox.list(true, null, reference, 1).items()).hasSize(1);
        inbox.resolve(reference, open.version(), true, "Decision communicated to the reader.");
        var closed = inbox.list(false, null, reference, 1).items().getFirst();
        assertThat(closed.resolutionNote()).isEqualTo("Decision communicated to the reader.");
        assertThat(closed.resolvedAt()).isNotNull();

        inbox.preserve(reference, closed.version(), true);
        jdbc.update("UPDATE publication_correspondence SET resolved_at=now()-interval '370 days' WHERE id=?", reference);
        inbox.expire();
        assertThat(inbox.list(false, null, reference, 1).items()).hasSize(1);
        assertThatThrownBy(() -> inbox.delete(reference, closed.version() + 1)).isInstanceOf(PublicationException.class);

        inbox.preserve(reference, closed.version() + 1, false);
        inbox.expire();
        assertThat(inbox.list(false, null, reference, 1).items()).isEmpty();
    }
}
