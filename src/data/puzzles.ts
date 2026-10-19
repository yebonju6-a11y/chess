export interface Puzzle {
  id: string;
  title: string;
  category: string;
  description: string;
  fen: string;
  playerColor: 'w' | 'b';
  solutionMoves: { from: string; to: string }[];
  hint: string;
  explanation: string;
}

export const BEGINNER_PUZZLES: Puzzle[] = [
  {
    id: 'mate-in-1-scholar',
    title: '1수 체크메이트: 스칼라 메이트',
    category: '체크메이트',
    description: '비숍의 지원을 받는 퀸으로 f7 약점을 찔러 즉시 체크메이트하세요.',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    playerColor: 'w',
    solutionMoves: [{ from: 'h5', to: 'f7' }],
    hint: 'f7에 있는 폰은 흑의 킹만이 지키고 있습니다. 퀸을 c4 비숍과 연계해 보세요!',
    explanation: 'f7 칸은 체스 오프닝에서 가장 취약한 지점입니다. 비숍이 퀸을 보호하므로 흑의 킹은 퀸을 잡을 수 없어 게임이 끝납니다!',
  },
  {
    id: 'back-rank-mate',
    title: '백랭크(Back Rank) 체크메이트',
    category: '체크메이트',
    description: '폰들에 갇혀 도망갈 곳 없는 흑의 킹을 룩으로 마무리하세요.',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'e1', to: 'e8' }],
    hint: '흑의 킹 앞에는 세 개의 폰이 벽처럼 막고 있습니다. 8열 맨 끝으로 룩을 보내보세요!',
    explanation: '이를 백랭크 메이트(Back-Rank Mate)라고 합니다. 킹 앞에 있는 폰들이 킹의 탈출로를 막고 있을 때 1열이나 8열에서 직선 공격을 가하면 피할 수 없습니다.',
  },
  {
    id: 'knight-fork-royalty',
    title: '나이트 포크: 킹과 퀸 동시 공격',
    category: '포크 전술',
    description: '나이트의 뛰어넘는 특성을 이용해 킹과 퀸을 동시에 포크(Fork)하세요.',
    fen: 'r1b1k2r/pp1p1ppp/2p5/4q3/4N3/8/PPP1PPPP/R2QKB1R w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'e4', to: 'd6' }],
    hint: 'd6 칸으로 나이트가 들어가면 체크가 되면서 동시에 무엇을 노릴 수 있을까요?',
    explanation: '나이트는 기물을 뛰어넘어 공격하므로 상대는 피하거나 잡아야 합니다. 킹이 체크를 피하는 동안 상대의 중요한 퀸을 포획할 수 있습니다!',
  },
  {
    id: 'hanging-queen-capture',
    title: '무방비 기물 포획: 공짜 퀸 잡기',
    category: '기물 이득',
    description: '흑이 실수로 퀸을 아무 보호 없이 노출시켰습니다. 바로 잡아내세요.',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/4q3/3P4/PPP2PPP/RNBQKBNR w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'd3', to: 'e4' }],
    hint: 'd3에 있는 백의 폰을 살펴보세요. e4에 있는 흑의 퀸이 보호받고 있나요?',
    explanation: '체스 초보자 대국에서 가장 빈번한 실수는 기물을 무방비(Hanging)로 두는 것입니다. 1점짜리 폰으로 9점짜리 퀸을 잡는 엄청난 이득을 챙겼습니다!',
  },
  {
    id: 'pin-the-rook',
    title: '핀(Pin) 전술: 꼼짝 못하는 기물',
    category: '핀 전술',
    description: '비숍으로 상대의 룩을 킹의 공격선상에 묶어두고(Pin) 잡아내세요.',
    fen: '4k3/4r3/8/8/8/2B5/5PPP/6K1 w - - 0 1',
    playerColor: 'w',
    solutionMoves: [{ from: 'c3', to: 'b4' }],
    hint: '비숍을 대각선으로 움직여 룩과 킹을 같은 선상에 놓아보세요.',
    explanation: '핀(Pin)에 걸린 기물은 뒤에 킹이 있기 때문에 규칙상 다른 곳으로 피할 수 없습니다. 다음 수에 이 룩을 확실하게 잡을 수 있습니다.',
  },
];
