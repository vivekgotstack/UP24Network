package com.up24.news.automation.internal;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeMap;

@Component
class CricketSource implements AutomationSource {
    private static final Set<String> COMPLETED = Set.of("Finished", "Aban.", "Cancl.");
    private static final Set<String> LIVE = Set.of(
            "1st Innings", "2nd Innings", "3rd Innings", "4th Innings", "Innings Break",
            "Tea Break", "Lunch", "Dinner", "Int.", "Stump Day 1", "Stump Day 2",
            "Stump Day 3", "Stump Day 4");
    private static final int MAX_INGESTED_MATCHES = 100;

    private final RestClient http;
    private final CricketScoreboards scores;
    private final Clock clock;
    private final String token;

    CricketSource(RestClient.Builder builder, CricketScoreboards scores, Clock clock,
                  @Value("${up24.providers.sportmonks.cricket-api-token:}") String token) {
        this.http = SourceClients.create(builder, "https://cricket.sportmonks.com");
        this.scores = scores;
        this.clock = clock;
        this.token = token.strip();
    }

    @Override public String key() { return "cricket"; }
    @Override public int maxIntervalMinutes() { return 15; }

    @Override
    public Status status() {
        return token.isBlank()
                ? new Status(false, "Set SPORTMONKS_CRICKET_API_TOKEN in the backend environment.")
                : new Status(true, "Scoreboard refreshes use one request per run for competitions covered by your Sportmonks plan.");
    }

    @Override
    public Prepared prepare() {
        var response = http.get().uri(uri -> uri.path("/api/v2.0/livescores")
                        .queryParam("api_token", "{token}")
                        .queryParam("include", "localteam,visitorteam,runs").build(token))
                .retrieve().body(JsonNode.class);
        if (response == null || !response.path("data").isArray()) {
            throw new IllegalStateException("Cricket provider did not return a score feed.");
        }
        var matches = decode(response.path("data"));
        var observedAt = clock.instant();
        return () -> scores.publish(matches, observedAt);
    }

    @Override
    public String resultMessage(int count) {
        return count == 0 ? "No fixtures in the live feed. Recent confirmed results remain available."
                : "Refreshed " + count + " cricket fixtures.";
    }

    private static List<CricketScoreboards.Observation> decode(JsonNode data) {
        var matches = new ArrayList<CricketScoreboards.Observation>();
        for (JsonNode fixture : data) {
            long id = fixture.path("id").asLong();
            var status = text(fixture.path("status"), 40);
            var runs = fixture.path("runs");
            var home = team(fixture.path("localteam"), runs);
            var away = team(fixture.path("visitorteam"), runs);
            if (id < 1 || status == null || home == null || away == null) continue;
            boolean completed = COMPLETED.contains(status);
            var match = new CricketScoreboards.Match(Long.toString(id), status,
                    text(fixture.path("note"), 200), LIVE.contains(status), home, away);
            matches.add(new CricketScoreboards.Observation(id, completed, match));
            if (matches.size() == MAX_INGESTED_MATCHES) break;
        }
        if (matches.isEmpty() && !data.isEmpty()) {
            throw new IllegalStateException("Cricket provider returned invalid fixtures.");
        }
        return List.copyOf(matches);
    }

    private static CricketScoreboards.Team team(JsonNode team, JsonNode runs) {
        String name = text(team.path("name"), 100);
        long id = team.path("id").asLong();
        if (name == null || id < 1) return null;
        String code = text(team.path("code"), 12);
        var innings = new TreeMap<Integer, String>();
        for (JsonNode run : runs) {
            if (run.path("team_id").asLong() != id) continue;
            int inning = run.path("inning").asInt();
            int total = run.path("score").asInt(-1);
            int wickets = run.path("wickets").asInt(-1);
            if (inning < 1 || inning > 8 || total < 0 || total > 2000) continue;
            String score = wickets >= 0 && wickets <= 10 ? total + "/" + wickets : Integer.toString(total);
            String overs = run.path("overs").asText();
            if (overs.matches("[0-9]{1,3}(\\.[0-9])?")) score += " (" + overs + " ov)";
            innings.put(inning, score);
        }
        return new CricketScoreboards.Team(name, code == null ? "" : code,
                innings.isEmpty() ? null : String.join(" · ", innings.values()));
    }

    private static String text(JsonNode value, int maxLength) {
        if (!value.isTextual()) return null;
        String text = value.asText().replaceAll("\\p{Cntrl}", " ").strip();
        return text.isEmpty() ? null : text.substring(0, Math.min(text.length(), maxLength));
    }
}
