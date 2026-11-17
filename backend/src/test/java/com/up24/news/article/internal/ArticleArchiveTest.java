package com.up24.news.article.internal;

import com.up24.news.article.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties={"up24.automation.scheduling-enabled=false","up24.bootstrap.admin-email="})
@Transactional
class ArticleArchiveTest {
    @Autowired ArticleArchive archive;
    @Autowired Articles articles;
    @Autowired JdbcTemplate jdbc;
    @Test void historicalStoriesRemainPublicAndOldAddressesCannotBeReassigned() {
        var id=UUID.randomUUID();var published=ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).minusYears(5);
        String original="original-"+id,canonical="canonical-"+id;
        jdbc.update("INSERT INTO article_record(id,slug,title,summary,category,author,status,published_at) VALUES (?,?,'Historical report','Summary','India','Desk','PUBLISHED',?)",id,original,Timestamp.from(published.toInstant()));
        jdbc.update("UPDATE article_record SET slug=?,version=version+1 WHERE id=?",canonical,id);
        assertThat(articles.findPublished(original)).isPresent().get().extracting(ArticleView::slug).isEqualTo(canonical);
        var month=archive.month(published.getYear(),published.getMonthValue(),1,12);
        assertThat(month.items()).extracting(ArticleView::slug).contains(canonical);
        assertThat(month.items()).allSatisfy(item -> assertThat(item.paragraphs()).isEmpty());
        assertThat(archive.years()).extracting(ArticleArchive.Year::year).contains(published.getYear());
        assertThatThrownBy(()->jdbc.update("INSERT INTO article_record(id,slug,title,summary,category,author) VALUES (?,?,'Another report','Summary','India','Desk')",UUID.randomUUID(),original))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
