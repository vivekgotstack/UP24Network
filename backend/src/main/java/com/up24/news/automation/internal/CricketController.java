package com.up24.news.automation.internal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;

@RestController
class CricketController {
    private final CricketSource source;
    private final CricketScoreboards scores;
    private final Clock clock;

    CricketController(CricketSource source, CricketScoreboards scores, Clock clock) {
        this.source = source;
        this.scores = scores;
        this.clock = clock;
    }

    @GetMapping("/api/cricket/scores")
    CricketScoreboards.Feed latest() {
        return source.status().configured() ? scores.latest(clock.instant()) : CricketScoreboards.Feed.EMPTY;
    }
}
