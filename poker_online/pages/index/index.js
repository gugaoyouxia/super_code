const { GameEngine, newGuest, cloneState, evaluateHand } = require('../../utils/poker-engine');

const STAGE_TEXT = {
  waiting: '等待',
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
  handOver: '结束',
};

Page({
  data: {
    screen: 'lobby',
    playerName: '',
    serverURL: 'ws://127.0.0.1:8080/poker',
    state: null,
    tablePlayers: [],
    communitySlots: [],
    visibleLogs: [],
    stageText: '等待',
    waitingText: '等待开始...',
    isMyTurn: false,
    canCheck: true,
    toCall: 0,
    raiseAmount: 10,
    minRaiseTo: 10,
    maxRaiseTo: 10,
    raiseDisabled: true,
    actionLabel: '下注',
  },

  onLoad() {
    this.engine = null;
    this.meId = '';
    this.aiTimer = null;
    this.setData({
      playerName: `玩家${Math.floor(1000 + Math.random() * 9000)}`,
    });
  },

  onUnload() {
    this.clearAITimer();
  },

  onPlayerNameInput(event) {
    this.setData({ playerName: event.detail.value });
  },

  onServerURLInput(event) {
    this.setData({ serverURL: event.detail.value });
  },

  enterLocalTable() {
    this.clearAITimer();
    this.engine = new GameEngine({ smallBlind: 5, bigBlind: 10 });
    const me = newGuest({
      id: 'me',
      name: this.data.playerName.trim() || '你',
      avatar: '👤',
      seat: 0,
      chips: 1000,
      isMe: true,
    });
    this.meId = me.id;
    this.engine.seatPlayer(me);
    [
      { name: 'Alice', avatar: 'A', seat: 1 },
      { name: 'Bob', avatar: 'B', seat: 3 },
      { name: 'Carol', avatar: 'C', seat: 5 },
    ].forEach((bot) => {
      this.engine.seatPlayer(newGuest({
        id: `bot_${bot.seat}`,
        name: `${bot.name} AI`,
        avatar: bot.avatar,
        seat: bot.seat,
        chips: 1000,
        isMe: false,
      }));
    });
    this.setData({ screen: 'table' });
    this.syncState();
  },

  enterOnlineTable() {
    this.toast('在线模式需要服务端 WebSocket 协议实现，当前先保留本地对战版本');
  },

  backToLobby() {
    this.clearAITimer();
    this.engine = null;
    this.meId = '';
    this.setData({
      screen: 'lobby',
      state: null,
      tablePlayers: [],
      communitySlots: [],
      visibleLogs: [],
    });
  },

  startNewHand() {
    if (!this.engine) return;
    this.engine.startNewHand();
    this.syncState();
    this.scheduleAITurn();
  },

  fold() {
    this.performMeAction({ type: 'fold' });
  },

  check() {
    this.performMeAction({ type: 'check' });
  },

  call() {
    this.performMeAction({ type: 'call' });
  },

  betOrRaise() {
    if (!this.engine) return;
    const amount = Number(this.data.raiseAmount);
    const type = this.engine.state.currentBet === 0 ? 'bet' : 'raise';
    this.performMeAction(type === 'bet'
      ? { type, amount }
      : { type, toAmount: amount });
  },

  allIn() {
    this.performMeAction({ type: 'allIn' });
  },

  onRaiseChanging(event) {
    this.setData({ raiseAmount: Number(event.detail.value) });
  },

  performMeAction(action) {
    if (!this.engine || !this.meId) return;
    const ok = this.engine.performAction(action, this.meId);
    if (!ok) {
      this.toast('当前不能执行这个动作');
      return;
    }
    this.syncState();
    this.scheduleAITurn();
  },

  scheduleAITurn() {
    this.clearAITimer();
    if (!this.engine) return;
    const activeSeat = this.engine.state.activeSeat;
    if (activeSeat == null) return;
    const player = this.engine.state.players.find((item) => item.seat === activeSeat);
    if (!player || player.isMe || player.status !== 'active') return;

    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      this.botAct(player.id);
    }, 650);
  },

  clearAITimer() {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  },

  botAct(playerId) {
    if (!this.engine) return;
    const player = this.engine.state.players.find((item) => item.id === playerId);
    if (!player || player.status !== 'active') return;

    const toCall = this.engine.state.currentBet - player.currentBet;
    const strength = this.botEvalStrength(player);
    let action;

    if (strength > 0.75) {
      const raiseTo = Math.min(
        player.chips + player.currentBet,
        this.engine.state.currentBet + Math.max(this.engine.state.minRaise, 30),
      );
      if (this.engine.state.currentBet === 0) {
        action = { type: 'bet', amount: Math.min(30, player.chips) };
      } else if (raiseTo > this.engine.state.currentBet) {
        action = { type: 'raise', toAmount: raiseTo };
      } else {
        action = { type: 'call' };
      }
    } else if (strength > 0.4) {
      if (toCall === 0) {
        action = { type: 'check' };
      } else if (toCall <= Math.max(1, Math.floor(player.chips / 4))) {
        action = { type: 'call' };
      } else {
        action = { type: 'fold' };
      }
    } else {
      action = toCall === 0 ? { type: 'check' } : { type: 'fold' };
    }

    this.engine.performAction(action, playerId);
    this.syncState();
    this.scheduleAITurn();
  },

  botEvalStrength(player) {
    const cards = player.holeCards.concat(this.engine.state.communityCards);
    if (cards.length < 2) return 0.5;
    if (cards.length < 5) {
      const holeCards = player.holeCards;
      if (holeCards.length < 2) return 0.3;
      const r1 = holeCards[0].rank;
      const r2 = holeCards[1].rank;
      let score = (Math.max(r1, r2) / 14) * 0.5;
      if (r1 === r2) score += 0.4;
      if (holeCards[0].suit === holeCards[1].suit) score += 0.05;
      if (Math.abs(r1 - r2) === 1) score += 0.05;
      return Math.min(score, 1);
    }
    return Math.min(evaluateHand(cards).rankValue / 10 + 0.1, 1);
  },

  syncState() {
    if (!this.engine) return;
    const state = cloneState(this.engine.state);
    const me = state.players.find((player) => player.id === this.meId);
    const isMyTurn = !!(me && state.activeSeat === me.seat && me.status === 'active');
    const toCall = me ? Math.max(0, state.currentBet - me.currentBet) : 0;
    const minRaiseTo = state.currentBet === 0
      ? Math.max(state.bigBlind, state.minRaise)
      : state.currentBet + state.minRaise;
    const rawMaxRaiseTo = me ? me.currentBet + me.chips : minRaiseTo;
    const maxRaiseTo = Math.max(rawMaxRaiseTo, minRaiseTo);
    const raiseDisabled = !isMyTurn || rawMaxRaiseTo < minRaiseTo;
    let raiseAmount = Number(this.data.raiseAmount) || minRaiseTo;
    if (raiseDisabled) {
      raiseAmount = Math.min(minRaiseTo, maxRaiseTo);
    } else {
      raiseAmount = Math.min(Math.max(raiseAmount, minRaiseTo), maxRaiseTo);
    }

    this.setData({
      state,
      tablePlayers: this.formatPlayers(state),
      communitySlots: this.formatCommunityCards(state.communityCards),
      visibleLogs: state.lastActionLog.slice(-4).map((text, index) => ({ id: index, text })),
      stageText: STAGE_TEXT[state.stage] || state.stage,
      waitingText: this.waitingText(state),
      isMyTurn,
      canCheck: toCall === 0,
      toCall,
      minRaiseTo,
      maxRaiseTo,
      raiseAmount,
      raiseDisabled,
      actionLabel: state.currentBet === 0 ? '下注' : '加注到',
    });
  },

  formatPlayers(state) {
    const showAllCards = state.stage === 'showdown' || state.stage === 'handOver';
    return state.players.map((player) => {
      const showCards = showAllCards || player.isMe;
      return {
        ...player,
        seatClass: `seat-${player.seat}`,
        activeClass: state.activeSeat === player.seat ? 'is-active' : '',
        foldedClass: player.status === 'folded' ? 'is-folded' : '',
        statusText: this.statusText(player.status),
        cards: [0, 1].map((index) => this.formatHoleCard(player.holeCards[index], showCards)),
      };
    });
  },

  formatHoleCard(card, showCards) {
    if (!card) return { empty: true };
    if (!showCards) return { faceDown: true };
    return {
      display: card.display,
      rankDisplay: card.rankDisplay,
      suitSymbol: card.suitSymbol,
      colorClass: card.suitColor === 'red' ? 'red-card' : 'black-card',
    };
  },

  formatCommunityCards(cards) {
    const slots = [];
    for (let i = 0; i < 5; i += 1) {
      const card = cards[i];
      slots.push(card ? {
        empty: false,
        rankDisplay: card.rankDisplay,
        suitSymbol: card.suitSymbol,
        colorClass: card.suitColor === 'red' ? 'red-card' : 'black-card',
      } : {
        empty: true,
      });
    }
    return slots;
  },

  statusText(status) {
    if (status === 'folded') return '弃牌';
    if (status === 'allIn') return 'ALL-IN';
    if (status === 'sittingOut') return '离桌';
    return '';
  },

  waitingText(state) {
    if (state.stage === 'waiting') return '等待开始...';
    if (state.stage === 'handOver') return '本手结束，请点击“开始下一手”';
    if (state.stage === 'showdown') return '摊牌中...';
    if (state.activeSeat != null) {
      const player = state.players.find((item) => item.seat === state.activeSeat);
      if (player) return `等待 ${player.name} 行动...`;
    }
    return '等待...';
  },

  toast(title) {
    if (typeof wx !== 'undefined' && wx.showToast) {
      wx.showToast({ title, icon: 'none' });
    }
  },
});
