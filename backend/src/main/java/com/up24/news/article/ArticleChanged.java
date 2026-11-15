package com.up24.news.article;

import java.util.UUID;

/** Published only after a successful content command, inside its transaction. */
public record ArticleChanged(UUID articleId) {}
