package com.up24.news.article.internal;

import com.up24.news.article.ArticleView;
import com.up24.news.article.Articles;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Temporary read-only fixtures. Never enabled by a production profile. */
@Service
@Profile("demo")
class DemoArticles implements Articles {
    private static final Instant SAMPLE_TIME = Instant.parse("2026-11-10T03:30:00Z");
    private final List<ArticleView> articles = List.of(
            story("closer-to-home", "A closer look at the places we call home",
                    "From the lanes of Lucknow to the ghats of Varanasi, the everyday stories that connect a state of millions.",
                    "Uttar Pradesh", "Lucknow", 4, "/images/heritage.jpg", "An Indian heritage monument reflected in water",
                    "A place is more than its biggest headline. Its neighbourhoods, public spaces and everyday journeys shape how people experience it. This sample feature previews the kind of local storytelling UP24Network aims to publish.",
                    "Our regional desk will start with questions readers can use: what is changing in my city, who does it affect, and where can I find the original information? Reporting should bring those answers together with context.",
                    "This is demonstration content for our first development milestone. It does not describe a reported event. Future articles will come from the editorial publishing workflow, with sources and verified details."),
            story("reading-beyond-headlines", "Beyond the headline: making sense of the national conversation",
                    "Good context starts with the original document, the people affected, and the questions still unanswered.",
                    "India", "New Delhi", 3, "/images/newsroom.jpg", "Newspapers arranged on a table",
                    "A headline can tell you what happened. Understanding why it matters takes a little more time: reading the underlying document, identifying who is affected, and distinguishing a proposal from a final decision.",
                    "Our explainers will make those distinctions visible. We want readers to understand the evidence behind a story and the limits of what is known.",
                    "This sample article demonstrates the reading experience. It is not a news report."),
            story("local-business-big-questions", "Small businesses. Big ambitions. A changing local economy.",
                    "The questions that matter to the shop owners, makers, and first-time founders building close to home.",
                    "Business", "Noida", 4, "/images/business.jpg", "Modern commercial buildings seen from below",
                    "Local business reporting starts with everyday decisions: the cost of a workspace, finding a first customer, or making a delivery reliably. Those details make economic stories useful.",
                    "UP24Network will explore these questions through reporting, data and direct conversations. A single business owner's experience can illustrate a problem, while broader evidence helps establish its scale.",
                    "This is sample editorial content for development, with no claims about a specific business or current economic conditions."),
            story("student-guide-to-next-steps", "The next chapter starts with the right questions",
                    "A practical way to think about courses, skills, and the decisions after school.",
                    "Education", "Prayagraj", 3, "/images/education.jpg", "Students collaborating on a university campus",
                    "Choosing a course is easier when the questions are specific. What will you learn, what does it cost, and how can you verify the institution's claims? Start with official course information and a realistic view of your time.",
                    "Our education coverage will separate verified application dates and eligibility rules from broader advice. Readers should always be able to find the official source for a deadline.",
                    "This demonstration article contains no current admissions announcement or application deadline."),
            story("heritage-in-everyday-life", "Where heritage meets the rhythm of everyday life",
                    "Looking at the craft, architecture, and shared spaces that keep a city's memory alive.",
                    "Culture", "Varanasi", 5, "/images/heritage.jpg", "Indian architecture under a clear morning sky",
                    "Heritage is part of daily life: a familiar street, a family craft, a building people pass on the way to work. Culture reporting can look beyond a landmark to the people who give it meaning.",
                    "We plan to explore these connections through original photography, conversations and careful historical sourcing. A beautiful image should invite a reader into a well-reported story.",
                    "This is an illustrative article for our development preview. It does not describe a reported visit or interview."),
            new ArticleView("a-moment-in-nature", "A moment in nature", "A close-up view of the world in bloom.",
                    "Environment", "Visual desk", "UP24 Visual Desk", SAMPLE_TIME, 1,
                    "/images/nature.jpg", "Flowers in soft natural light", "/videos/nature-sample.mp4",
                    List.of("This short sample film demonstrates how a video story appears on UP24Network. It is openly licensed example footage, not original UP24 reporting.",
                            "Video is available in this story. Other articles use photographs. The image remains available if a video cannot play."), true, null, false, null)
    );

    private static ArticleView story(String slug, String title, String summary, String category,
                                     String city, int minutes, String image, String alt, String... paragraphs) {
        return new ArticleView(slug, title, summary, category, city, "UP24 Editorial Desk",
                SAMPLE_TIME, minutes, image, alt, null, List.of(paragraphs), true, null, false, null);
    }

    @Override
    public List<ArticleView> published() {
        return articles;
    }

    @Override
    public Optional<ArticleView> findPublished(String slug) {
        return articles.stream().filter(article -> article.slug().equals(slug)).findFirst();
    }
}
