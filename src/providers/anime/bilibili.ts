import axios from 'axios';
import {
  AnimeParser,
  IAnimeEpisode,
  IAnimeInfo,
  IAnimeResult,
  IEpisodeServer,
  ISearch,
  ISource,
  ISubtitle,
} from '../../models';
import { BilibiliExtractor } from '../../utils';

class Bilibili extends AnimeParser {
  override readonly name = 'Bilibili';
  protected override baseUrl = 'https://bilibili.tv';
  protected override logo = 'https://www.apksforfree.com/wp-content/uploads/2021/10/oie_1413343NvdZCZR5.png';
  protected override classPath = 'ANIME.Bilibili';

  private apiUrl = 'https://api.bilibili.tv/intl/gateway/web';

  private cookie = '';
  private locale = 'en_US';
  private sgProxy = 'https://cors.proxy.consumet.org';

  constructor(cookie?: string, locale?: string) {
    super();
    this.locale = locale ?? this.locale;
    if (!cookie) throw new Error('Cookie is required');
    this.cookie = cookie;
  }

  override async search(query: string): Promise<ISearch<IAnimeResult>> {
    const { data } = await axios.get(
      `${this.sgProxy}/${this.apiUrl}/v2/search?keyword=${query}&platform=web&pn=1&ps=20&qid=&s_locale=${this.locale}`,
      { headers: { cookie: this.cookie } }
    );
    if (!data.data.filter((item: any) => item.module.includes('ogv')).length)
      return { results: [], totalResults: 0 };

    const results = data.data.find((item: any) => item.module.includes('ogv'));

    return {
      totalResults: results.items.length ?? 0,
      results: results.items.map(
        (item: any): IAnimeResult => ({
          id: item.season_id,
          title: item.title,
          image: item.cover,
          genres: item.styles.split(' / '),
          rating: item.score,
          view: item.view,
        })
      ),
    };
  }

  override async fetchAnimeInfo(id: string): Promise<IAnimeInfo> {
    try {
      const { data } = await axios.get(
        `${this.sgProxy}/https://app.biliintl.com/intl/gateway/v2/ogv/view/app/season2?locale=${this.locale}&platform=android&season_id=${id}`,
        { headers: { cookie: this.cookie } }
      );
      const episodes = data.data.sections.section.flatMap((section: any) =>
        section.ep_details.map(
          (ep: any, i: number): IAnimeEpisode => ({
            id: ep.episode_id.toString(),
            number: i + 1,
            title: ep.long_title || ep.title,
            image: ep.horizontal_cover,
          })
        )
      );
      return {
        id,
        title: data.data.title,
        description: data.data.details.desc.value,
        seasons: data.data.season_series.map((season: any) => ({
          id: season.season_id,
          title: season.title,
        })),
        recommendations: data.data.for_you.item_details.map((section: any) => ({
          id: section.season_id,
          title: section.title,
          image: section.horizontal_cover,
          genres: section.styles.split(' / '),
          views: section.view,
        })),
        episodes: episodes,
        totalEpisodes: episodes.length,
      };
    } catch (err) {
      throw err;
    }
  }

  override async fetchEpisodeSources(episodeId: string, ...args: any): Promise<ISource> {
    try {
      const { data } = await axios.get(
        `${this.sgProxy}/${this.apiUrl}/v2/subtitle?s_locale=${this.locale}&platform=web&episode_id=${episodeId}`,
        { headers: { cookie: this.cookie } }
      );
      // const ss = await axios.get(
      //   `${this.sgProxy}/${this.apiUrl}/playurl?s_locale=${this.locale}&platform=web&ep_id=${episodeId}`,
      //   { headers: { cookie: this.cookie } }
      // );

      const sources = await new BilibiliExtractor().extract(episodeId);
      return {
        sources: sources.sources,
        subtitles: data.data.subtitles.map(
          (sub: any): ISubtitle => ({
            id: sub.subtitle_id,
            lang: sub.lang,
            url: `https://api.consumet.org/utils/bilibili/subtitle?url=${sub.url}`,
          })
        ),
      };
    } catch (err) {
      throw err;
    }
  }

  override async fetchEpisodeServers(episodeId: string): Promise<IEpisodeServer[]> {
    throw new Error('Method not implemented.');
  }
}

// (async () => {
//   const source = new Bilibili();

//   const result = await source.search('classroom of the elite');
//   const info = await source.fetchAnimeInfo(result.results[0].id);
//   const episode = await source.fetchEpisodeSources(info.episodes![0].id);
//   console.log(episode);
// })();

export default Bilibili;
