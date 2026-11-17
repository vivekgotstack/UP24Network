package com.up24.news.article;

import java.util.List;

/** Historical published journalism stays in the public article catalogue. */
public interface ArticleArchive {
    record Year(int year,long articles) {}
    List<Year> years();
    ArticlePage month(int year,int month,int page,int size);
}
