import { brand } from "@/lib/brand";
import { YouTubeStory } from "@/components/youtube-story";

export function WatchSection() {
  return (
    <section className="watch-section" id="watch" aria-label="Watch UP24">
      <div className="watch-heading"><p className="eyebrow">UP24Network / WATCH</p><h2>Press play.</h2><p>From our newsroom.</p>
        <a className="channel-link" href={brand.featuredVideo.channel} target="_blank" rel="noopener noreferrer">Visit our YouTube channel</a></div>
      <div className="watch-films">
        <article className="watch-film">
          <div className="watch-screen"><YouTubeStory videoId={brand.featuredVideo.id} title={brand.featuredVideo.title} /></div>
          <div className="watch-film-caption"><h3 lang="hi">{brand.featuredVideo.title}</h3><span>UP24Network</span></div>
        </article>
      </div>
    </section>
  );
}
