(() => {
  'use strict';
  const MANUAL = '__manual__';
  const TYPES = {
    MLB:['ml','spread','f5_ml','f5_spread','f5_total_over','f5_total_under','team_total_over','team_total_under','total_over','total_under','pitcher_outs_under','pitcher_ks','pitcher_ks_under','player_hits','player_total_bases','player_runs','player_hr','player_rbi','player_walks','player_stolen_bases','player_hwsb','player_hrrbi','manual','void'],
    NBA:['ml','spread','h1_ml','h1_spread','team_total_over','team_total_under','total_over','total_under','player_points','player_rebounds','player_assists','player_points_rebounds','player_pr','player_points_assists','player_pa','player_rebounds_assists','player_ra','player_points_rebounds_assists','player_pra','player_double_double','player_triple_double','player_blocks','player_threes','manual','void'],
    WNBA:['ml','spread','h1_ml','h1_spread','team_total_over','team_total_under','total_over','total_under','player_points','player_rebounds','player_assists','player_points_rebounds','player_pr','player_points_assists','player_pa','player_rebounds_assists','player_ra','player_points_rebounds_assists','player_pra','player_double_double','player_triple_double','player_blocks','player_threes','manual','void'],
    WC:['ml','ml_et','to_qualify','spread','draw','h1_ml','h1_spread','h1_draw','h1_total_over','h1_total_under','h2_total_over','h2_total_under','team_total_over','team_total_under','total_over','total_under','btts_yes','btts_no','player_goal','player_goal_et','player_assist','player_goal_or_assist','player_shots','player_sot','player_fouls','player_fouls_drawn','player_tackles','player_cards','team_corners_over','team_corners_under','team_cards_over','team_cards_under','match_corners_over','match_corners_under','match_cards_over','match_cards_under','team_shots_over','team_shots_under','match_shots_over','match_shots_under','team_sot_over','team_sot_under','match_sot_over','match_sot_under','team_sot_half_over','team_sot_half_under','manual','void']
  };
  const LABELS = {
    ml:'Moneyline',ml_et:'Moneyline incl. ET',to_qualify:'To Qualify',spread:'Spread',draw:'Draw',h1_ml:'1H Moneyline',h1_spread:'1H Spread',h1_draw:'1H Draw',f5_ml:'F5 Moneyline',f5_spread:'F5 Spread',f5_total_over:'F5 Total Over',f5_total_under:'F5 Total Under',team_total_over:'Team Total Over',team_total_under:'Team Total Under',total_over:'Total Over',total_under:'Total Under',h1_total_over:'1H Total Over',h1_total_under:'1H Total Under',h2_total_over:'2H Total Over',h2_total_under:'2H Total Under',pitcher_outs_under:'Pitcher Outs Under',pitcher_ks:'Pitcher Strikeouts',pitcher_ks_under:'Pitcher Strikeouts Under',player_hits:'Player Hits',player_total_bases:'Player Total Bases',player_runs:'Player Runs',player_hr:'Player HR',player_rbi:'Player RBI',player_walks:'Player Walks',player_stolen_bases:'Player Stolen Bases',player_hwsb:'H+BB+SB',player_hrrbi:'H+R+RBI',player_points:'Player Points',player_rebounds:'Player Rebounds',player_assists:'Player Assists',player_threes:'Player 3PM',player_blocks:'Player Blocks',player_points_rebounds:'Player P+R',player_pr:'Player P+R',player_points_assists:'Player P+A',player_pa:'Player P+A',player_rebounds_assists:'Player R+A',player_ra:'Player R+A',player_points_rebounds_assists:'Player PRA',player_pra:'Player PRA',player_double_double:'Double Double',player_triple_double:'Triple Double',player_goal:'Anytime Goal',player_goal_et:'Anytime Goal incl. ET',player_assist:'Assist',player_goal_or_assist:'Goal or Assist',player_shots:'Player Shots',player_sot:'Player SOT',player_fouls:'Player Fouls',player_fouls_drawn:'Player Fouls Drawn',player_tackles:'Player Tackles',player_cards:'Player Cards',team_corners_over:'Team Corners Over',team_corners_under:'Team Corners Under',match_corners_over:'Match Corners Over',match_corners_under:'Match Corners Under',team_cards_over:'Team Cards Over',team_cards_under:'Team Cards Under',match_cards_over:'Match Cards Over',match_cards_under:'Match Cards Under',team_shots_over:'Team Shots Over',team_shots_under:'Team Shots Under',match_shots_over:'Match Shots Over',match_shots_under:'Match Shots Under',team_sot_over:'Team SOT Over',team_sot_under:'Team SOT Under',match_sot_over:'Match SOT Over',match_sot_under:'Match SOT Under',team_sot_half_over:'Team SOT Half Over',team_sot_half_under:'Team SOT Half Under',btts_yes:'BTTS Yes',btts_no:'BTTS No',manual:'Manual',void:'Void'
  };
  const TEAM_CODES = {
    MLB:['ARI','ATH','ATL','BAL','BOS','CHC','CWS','CIN','CLE','COL','DET','HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','PHI','PIT','SD','SEA','SF','STL','TB','TEX','TOR','WSH'],
    NBA:['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GS','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SA','TOR','UTA','WAS'],
    WNBA:['ATL','CHI','CON','DAL','GS','IND','LA','LV','MIN','NY','PHX','SEA','WAS'],
    WC:['ARG','AUS','AUT','BEL','BIH','BRA','CAN','CIV','COD','COL','CPV','CRO','CUW','CZE','DZA','ECU','EGY','ENG','ESP','FRA','GER','GHA','HTI','IRI','IRQ','JOR','JPN','KOR','KSA','MAR','MEX','NED','NOR','NZL','PAN','PAR','POR','QAT','RSA','SCO','SEN','SUI','SWE','TUN','TUR','URU','USA','UZB']
  };
  const TEAM_NAMES = {
    MLB:{ARI:'Arizona Diamondbacks',ATH:'Athletics',ATL:'Atlanta Braves',BAL:'Baltimore Orioles',BOS:'Boston Red Sox',CHC:'Chicago Cubs',CWS:'Chicago White Sox',CIN:'Cincinnati Reds',CLE:'Cleveland Guardians',COL:'Colorado Rockies',DET:'Detroit Tigers',HOU:'Houston Astros',KC:'Kansas City Royals',LAA:'Los Angeles Angels',LAD:'Los Angeles Dodgers',MIA:'Miami Marlins',MIL:'Milwaukee Brewers',MIN:'Minnesota Twins',NYM:'New York Mets',NYY:'New York Yankees',PHI:'Philadelphia Phillies',PIT:'Pittsburgh Pirates',SD:'San Diego Padres',SEA:'Seattle Mariners',SF:'San Francisco Giants',STL:'St. Louis Cardinals',TB:'Tampa Bay Rays',TEX:'Texas Rangers',TOR:'Toronto Blue Jays',WSH:'Washington Nationals'},
    NBA:{ATL:'Atlanta Hawks',BOS:'Boston Celtics',BKN:'Brooklyn Nets',CHA:'Charlotte Hornets',CHI:'Chicago Bulls',CLE:'Cleveland Cavaliers',DAL:'Dallas Mavericks',DEN:'Denver Nuggets',DET:'Detroit Pistons',GS:'Golden State Warriors',HOU:'Houston Rockets',IND:'Indiana Pacers',LAC:'Los Angeles Clippers',LAL:'Los Angeles Lakers',MEM:'Memphis Grizzlies',MIA:'Miami Heat',MIL:'Milwaukee Bucks',MIN:'Minnesota Timberwolves',NOP:'New Orleans Pelicans',NYK:'New York Knicks',OKC:'Oklahoma City Thunder',ORL:'Orlando Magic',PHI:'Philadelphia 76ers',PHX:'Phoenix Suns',POR:'Portland Trail Blazers',SAC:'Sacramento Kings',SA:'San Antonio Spurs',TOR:'Toronto Raptors',UTA:'Utah Jazz',WAS:'Washington Wizards'},
    WNBA:{ATL:'Atlanta Dream',CHI:'Chicago Sky',CON:'Connecticut Sun',DAL:'Dallas Wings',GS:'Golden State Valkyries',IND:'Indiana Fever',LA:'Los Angeles Sparks',LV:'Las Vegas Aces',MIN:'Minnesota Lynx',NY:'New York Liberty',PHX:'Phoenix Mercury',SEA:'Seattle Storm',WAS:'Washington Mystics'},
    WC:{ARG:'Argentina',AUS:'Australia',AUT:'Austria',BEL:'Belgium',BIH:'Bosnia and Herzegovina',BRA:'Brazil',CAN:'Canada',CIV:'Ivory Coast',COD:'Congo DR',COL:'Colombia',CPV:'Cabo Verde',CRO:'Croatia',CUW:'Curaçao',CZE:'Czechia',DZA:'Algeria',ECU:'Ecuador',EGY:'Egypt',ENG:'England',ESP:'Spain',FRA:'France',GER:'Germany',GHA:'Ghana',HTI:'Haiti',IRI:'Iran',IRQ:'Iraq',JOR:'Jordan',JPN:'Japan',KOR:'South Korea',KSA:'Saudi Arabia',MAR:'Morocco',MEX:'Mexico',NED:'Netherlands',NOR:'Norway',NZL:'New Zealand',PAN:'Panama',PAR:'Paraguay',POR:'Portugal',QAT:'Qatar',RSA:'South Africa',SCO:'Scotland',SEN:'Senegal',SUI:'Switzerland',SWE:'Sweden',TUN:'Tunisia',TUR:'Türkiye',URU:'Uruguay',USA:'United States',UZB:'Uzbekistan'}
  };
  const normalizeType = type => String(type||'').trim().toLowerCase();
  const normalizeLeague = league => String(league||'').trim().toUpperCase();
  const normalizeCode = code => String(code||'').trim().toUpperCase();
  const isPlayer = type => normalizeType(type).startsWith('player_') || normalizeType(type).startsWith('pitcher_');
  const needsTarget = type => !['ml','ml_et','to_qualify','f5_ml','h1_ml','draw','h1_draw','btts_yes','btts_no','manual','void','player_double_double','player_triple_double'].includes(normalizeType(type));
  const needsTeam = type => !isPlayer(type) && !['manual','void','draw','h1_draw','btts_yes','btts_no','f5_total_over','f5_total_under','total_over','total_under','h1_total_over','h1_total_under','h2_total_over','h2_total_under','match_corners_over','match_corners_under','match_cards_over','match_cards_under','match_shots_over','match_shots_under','match_sot_over','match_sot_under'].includes(normalizeType(type));
  const range = (min,max,step=1) => { const out=[]; for(let n=min;n<=max+1e-9;n+=step) out.push(Number(n.toFixed(2))); return out; };
  function targetSpec(type, league) {
    type=normalizeType(type);league=normalizeLeague(league);
    const milestone={
      player_hits:range(1,5),player_total_bases:range(1,8),player_runs:range(1,4),player_hr:range(1,3),player_rbi:range(1,5),player_walks:range(1,4),player_stolen_bases:range(1,3),player_hwsb:range(1,8),player_hrrbi:range(1,10),pitcher_ks:range(1,15),
      player_points:range(5,50),player_rebounds:range(1,25),player_assists:range(1,20),player_points_rebounds:range(5,70),player_pr:range(5,70),player_points_assists:range(5,70),player_pa:range(5,70),player_rebounds_assists:range(2,40),player_ra:range(2,40),player_points_rebounds_assists:range(10,90),player_pra:range(10,90),player_blocks:range(1,10),player_threes:range(1,12),
      player_goal:range(1,3),player_goal_et:range(1,3),player_assist:range(1,3),player_goal_or_assist:range(1,4),player_shots:range(1,10),player_sot:range(1,7),player_fouls:range(1,8),player_fouls_drawn:range(1,8),player_tackles:range(1,10),player_cards:range(1,3)
    };
    if(milestone[type]) return {mode:'milestone',values:milestone[type]};
    if(type==='pitcher_ks_under') return {mode:'line',values:range(.5,15.5,1)};
    if(type==='pitcher_outs_under') return {mode:'line',values:range(.5,26.5,1)};
    if(['spread','f5_spread','h1_spread'].includes(type)) { const max=league==='MLB'?6.5:league==='WC'?5.5:30.5; return {mode:'spread',values:range(-max,max,1).filter(n=>n!==0)}; }
    if(['f5_total_over','f5_total_under'].includes(type)) return {mode:'line',values:range(.5,12.5,1)};
    if(['total_over','total_under'].includes(type)) return {mode:'line',values:range(.5,league==='MLB'?20.5:league==='NBA'||league==='WNBA'?300.5:8.5,1)};
    if(['team_total_over','team_total_under'].includes(type)) return {mode:'line',values:range(.5,league==='MLB'?12.5:league==='NBA'||league==='WNBA'?180.5:6.5,1)};
    if(['h1_total_over','h1_total_under','h2_total_over','h2_total_under'].includes(type)) return {mode:'line',values:range(.5,6.5,1)};
    if(['team_corners_over','team_corners_under'].includes(type)) return {mode:'line',values:range(.5,12.5,1)};
    if(['match_corners_over','match_corners_under'].includes(type)) return {mode:'line',values:range(.5,20.5,1)};
    if(['team_cards_over','team_cards_under'].includes(type)) return {mode:'line',values:range(.5,7.5,1)};
    if(['match_cards_over','match_cards_under'].includes(type)) return {mode:'line',values:range(.5,12.5,1)};
    if(['team_shots_over','team_shots_under'].includes(type)) return {mode:'line',values:range(.5,30.5,1)};
    if(['match_shots_over','match_shots_under'].includes(type)) return {mode:'line',values:range(.5,50.5,1)};
    if(['team_sot_over','team_sot_under','team_sot_half_over','team_sot_half_under'].includes(type)) return {mode:'line',values:range(.5,15.5,1)};
    if(['match_sot_over','match_sot_under'].includes(type)) return {mode:'line',values:range(.5,25.5,1)};
    return {mode:'none',values:[]};
  }
  const displayTeam = (code,league) => {const normalizedLeague=normalizeLeague(league),normalizedCode=normalizeCode(code);return TEAM_NAMES[normalizedLeague]?.[normalizedCode]||String(code||'').trim();};
  function gameTeams(game) {
    const value=String(game||'').trim();if(!value)return[];
    const at=value.split(/\s*@\s*/);if(at.length===2)return at.map(part=>normalizeCode(part));
    const versus=value.split(/\s+v(?:s\.?)?\s+/i);if(versus.length===2){const [home,away]=versus;return[normalizeCode(away),normalizeCode(home)];}
    return[];
  }
  function displayGame(game, league) { const teams=gameTeams(game); return teams.length===2 ? `${displayTeam(teams[0],league)} @ ${displayTeam(teams[1],league)}` : game; }
  function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;for(const child of Object.values(value))deepFreeze(child);return Object.freeze(value);}
  window.ParlayCatalog=deepFreeze({MANUAL,TYPES,LABELS,TEAM_CODES,TEAM_NAMES,isPlayer,needsTarget,needsTeam,targetSpec,displayTeam,displayGame,gameTeams});
})();
