const SUITS = [
  { key: 'spades', symbol: '♠', color: 'black' },
  { key: 'hearts', symbol: '♥', color: 'red' },
  { key: 'diamonds', symbol: '♦', color: 'red' },
  { key: 'clubs', symbol: '♣', color: 'black' },
];

const RANKS = [
  { value: 2, display: '2' },
  { value: 3, display: '3' },
  { value: 4, display: '4' },
  { value: 5, display: '5' },
  { value: 6, display: '6' },
  { value: 7, display: '7' },
  { value: 8, display: '8' },
  { value: 9, display: '9' },
  { value: 10, display: '10' },
  { value: 11, display: 'J' },
  { value: 12, display: 'Q' },
  { value: 13, display: 'K' },
  { value: 14, display: 'A' },
];

const HAND_RANKS = {
  highCard: { value: 1, name: '高牌' },
  pair: { value: 2, name: '一对' },
  twoPair: { value: 3, name: '两对' },
  threeOfAKind: { value: 4, name: '三条' },
  straight: { value: 5, name: '顺子' },
  flush: { value: 6, name: '同花' },
  fullHouse: { value: 7, name: '葫芦' },
  fourOfAKind: { value: 8, name: '四条' },
  straightFlush: { value: 9, name: '同花顺' },
  royalFlush: { value: 10, name: '皇家同花顺' },
};

function createCard(suit, rank) {
  return {
    suit: suit.key,
    suitSymbol: suit.symbol,
    suitColor: suit.color,
    rank: rank.value,
    rankDisplay: rank.display,
    id: `${rank.value}${suit.symbol}`,
    display: `${rank.display}${suit.symbol}`,
  };
}

function createDeck() {
  const cards = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => cards.push(createCard(suit, rank)));
  });
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = cards[i];
    cards[i] = cards[j];
    cards[j] = t;
  }
  return cards;
}

function draw(deck, n) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const card = deck.pop();
    if (card) out.push(card);
  }
  return out;
}

function newGuest({ id, name, avatar = '👤', seat, chips = 1000, isMe = false }) {
  return {
    id: id || `p_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name,
    avatar,
    chips,
    seat,
    holeCards: [],
    currentBet: 0,
    totalBetThisHand: 0,
    status: 'waiting',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isMe,
  };
}

function compareHandValue(lhs, rhs) {
  if (lhs.rankValue !== rhs.rankValue) {
    return lhs.rankValue - rhs.rankValue;
  }
  const len = Math.max(lhs.tiebreakers.length, rhs.tiebreakers.length);
  for (let i = 0; i < len; i += 1) {
    const l = lhs.tiebreakers[i] || 0;
    const r = rhs.tiebreakers[i] || 0;
    if (l !== r) return l - r;
  }
  return 0;
}

function combinations(array, choose) {
  if (choose === 0) return [[]];
  if (array.length < choose) return [];
  if (array.length === choose) return [array.slice()];
  if (choose === 1) return array.map((item) => [item]);
  const [first, ...rest] = array;
  const withFirst = combinations(rest, choose - 1).map((items) => [first].concat(items));
  return withFirst.concat(combinations(rest, choose));
}

function evaluateFive(cards) {
  const sorted = cards.slice().sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((card) => card.rank);
  const suits = sorted.map((card) => card.suit);
  const isFlush = new Set(suits).size === 1;
  const uniqueDescRanks = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let straightHigh = null;

  if (uniqueDescRanks.length === 5) {
    const high = uniqueDescRanks[0];
    const low = uniqueDescRanks[4];
    if (high - low === 4) straightHigh = high;
    if ([14, 5, 4, 3, 2].every((rank) => uniqueDescRanks.indexOf(rank) >= 0)) {
      straightHigh = 5;
    }
  }

  const counts = {};
  ranks.forEach((rank) => {
    counts[rank] = (counts[rank] || 0) + 1;
  });
  const grouped = Object.keys(counts)
    .map((rank) => ({ rank: Number(rank), count: counts[rank] }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return b.rank - a.rank;
    });
  const countPattern = grouped.map((item) => item.count);
  const rankByGroup = grouped.map((item) => item.rank);

  if (isFlush && straightHigh) {
    if (straightHigh === 14) {
      return handValue(HAND_RANKS.royalFlush, [14], sorted);
    }
    return handValue(HAND_RANKS.straightFlush, [straightHigh], sorted);
  }
  if (countPattern[0] === 4) {
    return handValue(HAND_RANKS.fourOfAKind, [rankByGroup[0], rankByGroup[1]], sorted);
  }
  if (countPattern[0] === 3 && countPattern[1] === 2) {
    return handValue(HAND_RANKS.fullHouse, [rankByGroup[0], rankByGroup[1]], sorted);
  }
  if (isFlush) {
    return handValue(HAND_RANKS.flush, ranks, sorted);
  }
  if (straightHigh) {
    return handValue(HAND_RANKS.straight, [straightHigh], sorted);
  }
  if (countPattern[0] === 3) {
    return handValue(HAND_RANKS.threeOfAKind, [rankByGroup[0]].concat(rankByGroup.slice(1, 3)), sorted);
  }
  if (countPattern[0] === 2 && countPattern[1] === 2) {
    return handValue(HAND_RANKS.twoPair, [rankByGroup[0], rankByGroup[1], rankByGroup[2]], sorted);
  }
  if (countPattern[0] === 2) {
    return handValue(HAND_RANKS.pair, [rankByGroup[0]].concat(rankByGroup.slice(1, 4)), sorted);
  }
  return handValue(HAND_RANKS.highCard, ranks, sorted);
}

function handValue(rank, tiebreakers, bestFive) {
  return {
    rankKey: rank.name,
    rankName: rank.name,
    rankValue: rank.value,
    tiebreakers,
    bestFive,
  };
}

function evaluateHand(cards) {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('需要5-7张牌');
  }
  let best = null;
  combinations(cards, 5).forEach((combo) => {
    const value = evaluateFive(combo);
    if (!best || compareHandValue(value, best) > 0) {
      best = value;
    }
  });
  return best;
}

class GameEngine {
  constructor({ smallBlind = 5, bigBlind = 10 } = {}) {
    this.state = {
      stage: 'waiting',
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      minRaise: 0,
      dealerSeat: 0,
      activeSeat: null,
      smallBlind,
      bigBlind,
      lastWinners: [],
      lastActionLog: [],
      actedThisRound: {},
    };
    this.deck = createDeck();
  }

  seatPlayer(player) {
    this.state.players.push(player);
    this.state.players.sort((a, b) => a.seat - b.seat);
  }

  removePlayer(id) {
    this.state.players = this.state.players.filter((player) => player.id !== id);
  }

  startNewHand() {
    if (this.state.players.filter((player) => player.chips > 0).length < 2) {
      this.log('等待更多玩家加入...');
      return;
    }

    this.deck = createDeck();
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlind;
    this.state.lastWinners = [];
    this.state.lastActionLog = [];
    this.state.actedThisRound = {};

    this.state.players = this.state.players.map((player) => ({
      ...player,
      holeCards: [],
      currentBet: 0,
      totalBetThisHand: 0,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      status: player.chips > 0 ? 'active' : 'sittingOut',
    }));

    const activeSeats = this.state.players
      .filter((player) => player.status === 'active')
      .map((player) => player.seat);
    if (activeSeats.length < 2) return;

    const nextDealer = this.nextSeat(this.state.dealerSeat, activeSeats);
    this.state.dealerSeat = nextDealer == null ? activeSeats[0] : nextDealer;

    const sbSeat = this.nextSeat(this.state.dealerSeat, activeSeats) || this.state.dealerSeat;
    const bbSeat = this.nextSeat(sbSeat, activeSeats) || sbSeat;
    const isHeadsUp = activeSeats.length === 2;
    this.markBlinds(this.state.dealerSeat, sbSeat, bbSeat, isHeadsUp);
    this.postBlinds(sbSeat, bbSeat, isHeadsUp);

    this.state.players = this.state.players.map((player) => {
      if (player.status !== 'active') return player;
      return { ...player, holeCards: draw(this.deck, 2) };
    });

    this.state.stage = 'preflop';
    this.state.activeSeat = isHeadsUp
      ? this.state.dealerSeat
      : (this.nextSeat(bbSeat, activeSeats) || sbSeat);
    this.log('==== 新一手开始 ====');
  }

  markBlinds(dealer, sb, bb, isHeadsUp) {
    this.state.players = this.state.players.map((player) => ({
      ...player,
      isDealer: player.seat === dealer,
      isSmallBlind: isHeadsUp ? player.seat === dealer : player.seat === sb,
      isBigBlind: player.seat === bb,
    }));
  }

  postBlinds(sbSeat, bbSeat, isHeadsUp) {
    const actualSB = isHeadsUp ? this.state.dealerSeat : sbSeat;
    const sbIdx = this.playerIndexAt(actualSB);
    if (sbIdx >= 0) {
      const player = this.state.players[sbIdx];
      const amount = Math.min(this.state.smallBlind, player.chips);
      this.state.players[sbIdx] = {
        ...player,
        chips: player.chips - amount,
        currentBet: amount,
        totalBetThisHand: player.totalBetThisHand + amount,
      };
      this.state.pot += amount;
      this.log(`${player.name} 下小盲 ${amount}`);
    }

    const bbIdx = this.playerIndexAt(bbSeat);
    if (bbIdx >= 0) {
      const player = this.state.players[bbIdx];
      const amount = Math.min(this.state.bigBlind, player.chips);
      this.state.players[bbIdx] = {
        ...player,
        chips: player.chips - amount,
        currentBet: amount,
        totalBetThisHand: player.totalBetThisHand + amount,
      };
      this.state.pot += amount;
      this.state.currentBet = amount;
      this.log(`${player.name} 下大盲 ${amount}`);
    }
  }

  performAction(action, playerId) {
    const activeSeat = this.state.activeSeat;
    const idx = this.state.players.findIndex((player) => player.id === playerId);
    if (activeSeat == null || idx < 0) return false;
    let player = this.state.players[idx];
    if (player.seat !== activeSeat || player.status !== 'active') return false;

    const toCall = this.state.currentBet - player.currentBet;
    let isAggressive = false;

    switch (action.type) {
      case 'fold':
        player = { ...player, status: 'folded' };
        this.log(`${player.name} 弃牌`);
        break;
      case 'check':
        if (toCall !== 0) return false;
        this.log(`${player.name} 看牌`);
        break;
      case 'call': {
        if (toCall <= 0) return false;
        const pay = Math.min(toCall, player.chips);
        player = {
          ...player,
          chips: player.chips - pay,
          currentBet: player.currentBet + pay,
          totalBetThisHand: player.totalBetThisHand + pay,
        };
        if (player.chips === 0) player.status = 'allIn';
        this.state.pot += pay;
        this.log(`${player.name} 跟注 ${pay}`);
        break;
      }
      case 'bet': {
        const amount = Number(action.amount);
        if (this.state.currentBet !== 0 || amount < this.state.bigBlind || amount > player.chips) return false;
        player = {
          ...player,
          chips: player.chips - amount,
          currentBet: player.currentBet + amount,
          totalBetThisHand: player.totalBetThisHand + amount,
        };
        if (player.chips === 0) player.status = 'allIn';
        this.state.pot += amount;
        this.state.currentBet = player.currentBet;
        this.state.minRaise = amount;
        isAggressive = true;
        this.log(`${player.name} 下注 ${amount}`);
        break;
      }
      case 'raise': {
        const toAmount = Number(action.toAmount);
        if (toAmount < this.state.currentBet + this.state.minRaise) return false;
        const pay = toAmount - player.currentBet;
        if (pay > player.chips) return false;
        player = {
          ...player,
          chips: player.chips - pay,
          currentBet: toAmount,
          totalBetThisHand: player.totalBetThisHand + pay,
        };
        this.state.pot += pay;
        this.state.minRaise = toAmount - this.state.currentBet;
        this.state.currentBet = toAmount;
        if (player.chips === 0) player.status = 'allIn';
        isAggressive = true;
        this.log(`${player.name} 加注到 ${toAmount}`);
        break;
      }
      case 'allIn': {
        const pay = player.chips;
        player = {
          ...player,
          chips: 0,
          currentBet: player.currentBet + pay,
          totalBetThisHand: player.totalBetThisHand + pay,
          status: 'allIn',
        };
        this.state.pot += pay;
        if (player.currentBet > this.state.currentBet) {
          this.state.minRaise = Math.max(this.state.minRaise, player.currentBet - this.state.currentBet);
          this.state.currentBet = player.currentBet;
          isAggressive = true;
        }
        this.log(`${player.name} All-in (${pay})`);
        break;
      }
      default:
        return false;
    }

    this.state.players[idx] = player;
    if (isAggressive) {
      this.state.actedThisRound = { [player.id]: true };
    } else {
      this.state.actedThisRound[player.id] = true;
    }

    this.advanceTurn();
    return true;
  }

  advanceTurn() {
    const alive = this.state.players.filter((player) => player.status === 'active' || player.status === 'allIn');
    if (alive.length === 1) {
      this.awardSinglePot(alive[0]);
      this.state.stage = 'handOver';
      this.state.activeSeat = null;
      return;
    }

    if (this.isBettingRoundComplete()) {
      this.goToNextStage();
      return;
    }

    const next = this.nextActingSeat(this.state.activeSeat == null ? this.state.dealerSeat : this.state.activeSeat);
    if (next == null) {
      this.goToNextStage();
    } else {
      this.state.activeSeat = next;
    }
  }

  isBettingRoundComplete() {
    const actors = this.state.players.filter((player) => player.status === 'active');
    if (actors.length === 0) return true;
    const aligned = actors.every((player) => player.currentBet === this.state.currentBet);
    const allActed = actors.every((player) => this.state.actedThisRound[player.id]);
    return aligned && allActed;
  }

  goToNextStage() {
    this.state.players = this.state.players.map((player) => ({ ...player, currentBet: 0 }));
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlind;
    this.state.actedThisRound = {};

    if (this.state.stage === 'preflop') {
      this.state.communityCards = this.state.communityCards.concat(draw(this.deck, 3));
      this.state.stage = 'flop';
      this.log('---- 翻牌 ----');
    } else if (this.state.stage === 'flop') {
      this.state.communityCards = this.state.communityCards.concat(draw(this.deck, 1));
      this.state.stage = 'turn';
      this.log('---- 转牌 ----');
    } else if (this.state.stage === 'turn') {
      this.state.communityCards = this.state.communityCards.concat(draw(this.deck, 1));
      this.state.stage = 'river';
      this.log('---- 河牌 ----');
    } else if (this.state.stage === 'river') {
      this.state.stage = 'showdown';
      this.showdown();
      return;
    } else {
      return;
    }

    const activeSeats = this.state.players
      .filter((player) => player.status === 'active')
      .map((player) => player.seat);
    if (activeSeats.length <= 1) {
      this.dealRemainingAndShowdown();
      return;
    }
    this.state.activeSeat = this.nextSeat(this.state.dealerSeat, activeSeats);
  }

  dealRemainingAndShowdown() {
    while (this.state.communityCards.length < 5) {
      this.state.communityCards = this.state.communityCards.concat(draw(this.deck, 1));
    }
    this.state.stage = 'showdown';
    this.showdown();
  }

  showdown() {
    const contenders = this.state.players.filter((player) => player.status === 'active' || player.status === 'allIn');
    if (!contenders.length) return;

    const evaluations = contenders.map((player) => ({
      player,
      value: evaluateHand(player.holeCards.concat(this.state.communityCards)),
    }));
    const pots = this.buildSidePots(contenders);
    const winners = [];

    pots.forEach((pot) => {
      const eligible = evaluations.filter((item) => pot.eligibleIds[item.player.id]);
      if (!eligible.length) return;
      const bestVal = eligible.reduce((best, item) => (
        !best || compareHandValue(item.value, best) > 0 ? item.value : best
      ), null);
      const topPlayers = eligible
        .filter((item) => compareHandValue(item.value, bestVal) === 0)
        .map((item) => item.player);
      const share = Math.floor(pot.amount / topPlayers.length);
      const remainder = pot.amount % topPlayers.length;
      topPlayers.forEach((winner, index) => {
        const amount = share + (index < remainder ? 1 : 0);
        const idx = this.state.players.findIndex((player) => player.id === winner.id);
        if (idx >= 0) {
          this.state.players[idx] = {
            ...this.state.players[idx],
            chips: this.state.players[idx].chips + amount,
          };
        }
        winners.push({
          id: `${winner.id}_${index}_${Date.now()}`,
          playerId: winner.id,
          playerName: winner.name,
          amountWon: amount,
          handDescription: bestVal.rankName,
        });
        this.log(`🏆 ${winner.name} 赢得 ${amount} (${bestVal.rankName})`);
      });
    });

    this.state.lastWinners = winners;
    this.state.pot = 0;
    this.state.stage = 'handOver';
    this.state.activeSeat = null;
  }

  awardSinglePot(player) {
    const idx = this.state.players.findIndex((item) => item.id === player.id);
    if (idx >= 0) {
      this.state.players[idx] = {
        ...this.state.players[idx],
        chips: this.state.players[idx].chips + this.state.pot,
      };
      this.state.lastWinners = [{
        id: `${player.id}_${Date.now()}`,
        playerId: player.id,
        playerName: player.name,
        amountWon: this.state.pot,
        handDescription: '其他人弃牌',
      }];
      this.log(`🏆 ${player.name} 赢得 ${this.state.pot}（其他玩家弃牌）`);
    }
    this.state.pot = 0;
  }

  buildSidePots(contenders) {
    const contenderIds = {};
    contenders.forEach((player) => {
      contenderIds[player.id] = true;
    });
    const participants = this.state.players.filter((player) => player.totalBetThisHand > 0);
    const levels = Array.from(new Set(participants.map((player) => player.totalBetThisHand))).sort((a, b) => a - b);
    const pots = [];
    let lastLevel = 0;

    levels.forEach((level) => {
      const layer = level - lastLevel;
      const contributors = participants.filter((player) => player.totalBetThisHand >= level);
      const eligibleIds = {};
      contenders
        .filter((player) => player.totalBetThisHand >= level && contenderIds[player.id])
        .forEach((player) => {
          eligibleIds[player.id] = true;
        });
      const amount = layer * contributors.length;
      if (amount > 0 && Object.keys(eligibleIds).length > 0) {
        pots.push({ amount, eligibleIds });
      }
      lastLevel = level;
    });
    return pots;
  }

  playerIndexAt(seat) {
    return this.state.players.findIndex((player) => player.seat === seat);
  }

  nextSeat(afterSeat, seats) {
    if (!seats.length) return null;
    const sorted = seats.slice().sort((a, b) => a - b);
    const next = sorted.find((seat) => seat > afterSeat);
    return next == null ? sorted[0] : next;
  }

  nextActingSeat(afterSeat) {
    const activeSeats = this.state.players
      .filter((player) => player.status === 'active')
      .map((player) => player.seat);
    if (!activeSeats.length) return null;
    return this.nextSeat(afterSeat, activeSeats);
  }

  log(message) {
    this.state.lastActionLog.push(message);
    if (this.state.lastActionLog.length > 60) {
      this.state.lastActionLog = this.state.lastActionLog.slice(-60);
    }
  }
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

module.exports = {
  GameEngine,
  newGuest,
  evaluateHand,
  compareHandValue,
  cloneState,
};
