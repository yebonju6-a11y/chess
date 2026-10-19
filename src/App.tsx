/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Lightbulb,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ShieldAlert,
  Swords,
  BookOpen,
  Award,
  ChevronRight,
  Flag,
  User,
  Bot,
  Sparkles,
  HelpCircle,
  Trophy,
} from 'lucide-react';

import { ChessBoard, BoardTheme } from './components/ChessBoard';
import { ChessPiece } from './components/ChessPiece';
import { PieceGuide } from './components/PieceGuide';
import { PuzzleMode } from './components/PuzzleMode';
import { sounds } from './utils/audio';
import {
  AIDifficulty,
  getAIMove,
  getCoachHint,
  analyzeThreats,
  calculateMaterial,
  CoachHint,
  ThreatAnalysis,
  KOREAN_PIECE_NAMES,
} from './utils/chessEngine';

// Image assets generated via generate_image
const COACH_AVATAR = '/src/assets/images/chess_coach_avatar_1792372436525.jpg';
const WOOD_BANNER = '/src/assets/images/chess_banner_wood_1792372437288.jpg';

type ActiveView = 'PLAY' | 'PUZZLE' | 'GUIDE';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('PLAY');
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [gameMode, setGameMode] = useState<'AI' | 'PASS_PLAY'>('AI');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(1);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('wood');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Beginner assistance toggles
  const [showLegalMoves, setShowLegalMoves] = useState<boolean>(true);
  const [showThreats, setShowThreats] = useState<boolean>(true);
  const [activeHint, setActiveHint] = useState<CoachHint | null>(null);

  // Move tracking & state
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [gameOverModal, setGameOverModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isWin: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    isWin: false,
  });

  // Sound sync
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  // Threat analysis for beginner warning
  const threats: ThreatAnalysis = useMemo(() => {
    return analyzeThreats(game, game.turn());
  }, [game]);

  // Material evaluation
  const material = useMemo(() => {
    return calculateMaterial(game);
  }, [game]);

  // Check Game End Condition
  const checkGameOver = useCallback((chessInstance: Chess) => {
    if (chessInstance.isCheckmate()) {
      sounds.playVictory();
      const winner = chessInstance.turn() === 'w' ? '흑(AI)' : '백(당신)';
      const isPlayerWin = (chessInstance.turn() === 'b' && gameMode === 'AI');

      if (isPlayerWin) {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      setGameOverModal({
        isOpen: true,
        title: '체크메이트! 외통수 승리',
        description: `${winner}이(가) 체크메이트로 멋진 승리를 거두었습니다!`,
        isWin: isPlayerWin,
      });
      return true;
    }

    if (chessInstance.isDraw()) {
      sounds.playCheck();
      let reason = '무승부로 경기가 종료되었습니다.';
      if (chessInstance.isStalemate()) {
        reason = '스테일메이트(Stalemate)입니다. 킹이 체크를 받지 않지만 합법적인 수가 없어 비겼습니다.';
      } else if (chessInstance.isThreefoldRepetition()) {
        reason = '3회 동형 반복 규칙으로 무승부 처리되었습니다.';
      } else if (chessInstance.isInsufficientMaterial()) {
        reason = '체크메이트를 만들 수 있는 기물이 부족하여 무승부입니다.';
      }
      setGameOverModal({
        isOpen: true,
        title: '무승부 (Draw)',
        description: reason,
        isWin: false,
      });
      return true;
    }

    return false;
  }, [gameMode]);

  // Handle Player Move
  const handleMove = useCallback(
    (from: Square, to: Square, promotion: PieceSymbol = 'q') => {
      if (isAiThinking) return;

      try {
        const moveResult = game.move({ from, to, promotion });
        if (!moveResult) return;

        // Sound effect
        if (moveResult.captured) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }

        if (game.inCheck()) {
          sounds.playCheck();
        }

        const newGame = new Chess(game.fen());
        setGame(newGame);
        setLastMove({ from, to });
        setMoveHistory(newGame.history());
        setActiveHint(null);

        // Check if game ended
        if (checkGameOver(newGame)) return;

        // If playing against AI and it's Black's turn (AI)
        if (gameMode === 'AI' && newGame.turn() === 'b') {
          setIsAiThinking(true);
          const aiDelay = aiDifficulty === 1 ? 550 : aiDifficulty === 2 ? 750 : 950;

          setTimeout(() => {
            const aiMove = getAIMove(newGame, aiDifficulty);
            if (aiMove) {
              const aiResult = newGame.move(aiMove);
              if (aiResult) {
                if (aiResult.captured) {
                  sounds.playCapture();
                } else {
                  sounds.playMove();
                }

                if (newGame.inCheck()) {
                  sounds.playCheck();
                }

                setGame(new Chess(newGame.fen()));
                setLastMove({ from: aiMove.from, to: aiMove.to });
                setMoveHistory(newGame.history());
                checkGameOver(newGame);
              }
            }
            setIsAiThinking(false);
          }, aiDelay);
        }
      } catch {
        // Invalid move
      }
    },
    [game, isAiThinking, gameMode, aiDifficulty, checkGameOver]
  );

  // Undo Move (Essential for Beginners!)
  const handleUndo = () => {
    if (isAiThinking) return;
    if (game.history().length === 0) return;

    sounds.playUndo();

    if (gameMode === 'AI') {
      // Undo both AI move and Player move
      game.undo();
      game.undo();
    } else {
      game.undo();
    }

    const newGame = new Chess(game.fen());
    setGame(newGame);
    setMoveHistory(newGame.history());
    setActiveHint(null);
    setGameOverModal({ isOpen: false, title: '', description: '', isWin: false });

    const hist = newGame.history({ verbose: true });
    if (hist.length > 0) {
      const last = hist[hist.length - 1];
      setLastMove({ from: last.from, to: last.to });
    } else {
      setLastMove(null);
    }
  };

  // Reset / New Game
  const startNewGame = () => {
    sounds.playMove();
    const freshGame = new Chess();
    setGame(freshGame);
    setLastMove(null);
    setMoveHistory([]);
    setActiveHint(null);
    setIsAiThinking(false);
    setGameOverModal({ isOpen: false, title: '', description: '', isWin: false });
  };

  // Ask Coach for Hint
  const handleAskCoachHint = () => {
    if (game.isGameOver()) return;
    const hint = getCoachHint(game);
    if (hint) {
      sounds.playHint();
      setActiveHint(hint);
    }
  };

  // Dynamic Coach commentary
  const coachCommentary = useMemo(() => {
    if (game.isCheckmate()) {
      return '대국이 체크메이트로 종료되었습니다! 복기해보며 다음 승리를 준비해보세요.';
    }
    if (game.inCheck()) {
      return '주의! 킹이 직접적인 체크 공격을 받고 있습니다. 먼저 킹을 보호해야 합니다.';
    }
    if (threats.hangingPieces.length > 0) {
      const pName = KOREAN_PIECE_NAMES[game.get(threats.hangingPieces[0])?.type || 'p'];
      return `조심하세요! ${pName}이(가) 상대 기물의 공격을 받고 있으며 보호되지 않았습니다!`;
    }
    if (moveHistory.length < 4) {
      return '오프닝의 황금률: 중앙 폰(e4/d4)을 먼저 밀고, 나이트와 비숍을 중앙으로 전개하세요!';
    }
    if (material.diff > 3) {
      return '아주 유리한 포지션입니다! 차분하게 기물을 교환하고 폰을 전진시키세요.';
    }
    if (material.diff < -3) {
      return '점수가 다소 불리하지만 괜찮습니다! 상대의 실수를 유도하며 킹 안전을 지키세요.';
    }
    return '좋은 흐름입니다. 둘 수 있는 후보 수들을 차분히 살펴보고 안전한 길을 선택하세요.';
  }, [game, threats, moveHistory, material.diff]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Primary Action) */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('PLAY');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
                <span className="font-serif text-lg font-black">♞</span>
              </div>
              <span>체스 메이트</span>
            </a>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveView('PLAY')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeView === 'PLAY' ? 'text-amber-700 font-semibold' : ''
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>체스 대국</span>
            </button>
            <button
              onClick={() => setActiveView('PUZZLE')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeView === 'PUZZLE' ? 'text-amber-700 font-semibold' : ''
              }`}
            >
              <Award className="w-4 h-4" />
              <span>전술 퀴즈</span>
            </button>
            <button
              onClick={() => setActiveView('GUIDE')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeView === 'GUIDE' ? 'text-amber-700 font-semibold' : ''
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>기물 도감 & 규칙</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={startNewGame}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              새 게임
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {/* Mobile View Switcher */}
        <div className="flex md:hidden items-center justify-center gap-1 p-1 bg-slate-200/70 rounded-lg mb-4 text-xs font-medium">
          <button
            onClick={() => setActiveView('PLAY')}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              activeView === 'PLAY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            체스 대국
          </button>
          <button
            onClick={() => setActiveView('PUZZLE')}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              activeView === 'PUZZLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            전술 퀴즈
          </button>
          <button
            onClick={() => setActiveView('GUIDE')}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              activeView === 'GUIDE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            도감 & 규칙
          </button>
        </div>

        {activeView === 'PUZZLE' && <PuzzleMode onBackToPlay={() => setActiveView('PLAY')} />}
        {activeView === 'GUIDE' && <PieceGuide />}

        {activeView === 'PLAY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Chessboard & HUD */}
            <div className="lg:col-span-7 flex flex-col items-center space-y-3">
              {/* Opponent HUD (Black) */}
              <div className="w-full max-w-[520px] flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs">
                    {gameMode === 'AI' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {gameMode === 'AI'
                          ? aiDifficulty === 1
                            ? '새싹 비기너 봇'
                            : aiDifficulty === 2
                            ? '친절한 체스봇'
                            : '체스 동아리 선배'
                          : '플레이어 2 (흑)'}
                      </span>
                      {game.turn() === 'b' && (
                        <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                          {isAiThinking ? '생각하는 중...' : '차례'}
                        </span>
                      )}
                    </div>
                    {/* Captured White pieces */}
                    <div className="flex items-center gap-0.5 mt-0.5 h-4">
                      {material.capturedByBlack.map((type, idx) => (
                        <div key={idx} className="w-3.5 h-3.5 shrink-0">
                          <ChessPiece type={type} color="w" />
                        </div>
                      ))}
                      {material.diff < 0 && (
                        <span className="text-[11px] font-mono text-slate-500 font-bold ml-1">
                          +{Math.abs(material.diff)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <span>흑 (Black)</span>
                </div>
              </div>

              {/* Main Board */}
              <ChessBoard
                game={game}
                threats={threats}
                showThreats={showThreats}
                showLegalMoves={showLegalMoves}
                theme={boardTheme}
                isFlipped={isFlipped}
                lastMove={lastMove}
                hintSquare={activeHint ? { from: activeHint.from, to: activeHint.to } : null}
                onMove={handleMove}
                disabled={isAiThinking}
              />

              {/* Player HUD (White) */}
              <div className="w-full max-w-[520px] flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {gameMode === 'AI' ? '플레이어 (당신)' : '플레이어 1 (백)'}
                      </span>
                      {game.turn() === 'w' && (
                        <span className="text-[10px] text-emerald-600 font-semibold">내 차례</span>
                      )}
                    </div>
                    {/* Captured Black pieces */}
                    <div className="flex items-center gap-0.5 mt-0.5 h-4">
                      {material.capturedByWhite.map((type, idx) => (
                        <div key={idx} className="w-3.5 h-3.5 shrink-0">
                          <ChessPiece type={type} color="b" />
                        </div>
                      ))}
                      {material.diff > 0 && (
                        <span className="text-[11px] font-mono text-emerald-700 font-bold ml-1">
                          +{material.diff}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={isAiThinking || moveHistory.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>무르기</span>
                  </button>
                </div>
              </div>

              {/* Board Quick Toggles Strip */}
              <div className="w-full max-w-[520px] flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showLegalMoves}
                      onChange={(e) => setShowLegalMoves(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-0"
                    />
                    <span>이동 경로 표시</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showThreats}
                      onChange={(e) => setShowThreats(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-0"
                    />
                    <span className="text-rose-700 font-medium">위협 감지 레이더</span>
                  </label>
                </div>

                {/* Theme Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">보드:</span>
                  {(['wood', 'emerald', 'slate'] as BoardTheme[]).map((thm) => (
                    <button
                      key={thm}
                      onClick={() => setBoardTheme(thm)}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        boardTheme === thm ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {thm === 'wood' ? '우드' : thm === 'emerald' ? '에메랄드' : '슬레이트'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: AI Coach & Game Control Sidebar */}
            <div className="lg:col-span-5 space-y-4">
              {/* Beginner Chess Coach Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <img
                    src={COACH_AVATAR}
                    alt="체스 코치"
                    className="w-16 h-16 rounded-xl object-cover border border-amber-200 shadow-xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">코치의 실시간 조언</h3>
                      <span className="text-[11px] text-amber-700 font-medium">체스 마스터</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{coachCommentary}</p>
                  </div>
                </div>

                {/* Ask Coach Hint Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={handleAskCoachHint}
                    disabled={isAiThinking || game.isGameOver()}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>코치에게 힌트 물어보기</span>
                  </button>
                </div>

                {/* Display Hint If Active */}
                {activeHint && (
                  <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        추천 수: {activeHint.from.toUpperCase()} → {activeHint.to.toUpperCase()} ({activeHint.san})
                      </span>
                      <span className="text-[11px] text-amber-700 font-medium">{activeHint.concept}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{activeHint.advice}</p>
                  </div>
                )}
              </div>

              {/* Game Mode & Difficulty Settings */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-2">대국 모드 선택</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGameMode('AI')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-2 ${
                        gameMode === 'AI'
                          ? 'border-amber-600 bg-amber-50 text-amber-950 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI 대국</span>
                    </button>
                    <button
                      onClick={() => setGameMode('PASS_PLAY')}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-2 ${
                        gameMode === 'PASS_PLAY'
                          ? 'border-amber-600 bg-amber-50 text-amber-950 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>2인 로컬 대국</span>
                    </button>
                  </div>
                </div>

                {gameMode === 'AI' && (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-2">AI 난이도 설정</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { level: 1 as AIDifficulty, label: '새싹 비기너', desc: '초보 추천' },
                        { level: 2 as AIDifficulty, label: '친절한 봇', desc: '기본 탄탄' },
                        { level: 3 as AIDifficulty, label: '동아리 선배', desc: '도전 레벨' },
                      ].map((item) => (
                        <button
                          key={item.level}
                          onClick={() => setAiDifficulty(item.level)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            aiDifficulty === item.level
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-xs font-bold leading-tight">{item.label}</span>
                          <span
                            className={`block text-[10px] mt-0.5 ${
                              aiDifficulty === item.level ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {item.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Move History Log */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">대국 기보 (이동 기록)</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    총 {Math.ceil(moveHistory.length / 2)}수 진행
                  </span>
                </div>

                <div className="h-32 overflow-y-auto rounded-lg bg-slate-50 p-2 border border-slate-100 text-xs font-mono space-y-1">
                  {moveHistory.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-sans text-xs">
                      기물이 이동하면 기보가 기록됩니다.
                    </div>
                  ) : (
                    Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                      const whiteMove = moveHistory[idx * 2];
                      const blackMove = moveHistory[idx * 2 + 1];
                      return (
                        <div key={idx} className="flex items-center justify-between px-2 py-0.5 hover:bg-slate-100 rounded">
                          <span className="text-slate-400 w-8">{idx + 1}.</span>
                          <span className="text-slate-900 font-semibold w-20">{whiteMove}</span>
                          <span className="text-slate-700 w-20">{blackMove || ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Link Card to Puzzles */}
              <button
                onClick={() => setActiveView('PUZZLE')}
                className="w-full text-left p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-xs hover:border-amber-300 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>초보자 실력 쑥쑥 전술 퀴즈</span>
                  </div>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    1수 체크메이트, 나이트 포크, 핀 전술 5단계를 마스터해보세요!
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Game Over Modal */}
      {gameOverModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-sm ${
                gameOverModal.isWin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {gameOverModal.isWin ? '🏆' : '♟️'}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">{gameOverModal.title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{gameOverModal.description}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setGameOverModal({ ...gameOverModal, isOpen: false })}
                className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                기보 검토하기
              </button>
              <button
                onClick={startNewGame}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                한 판 더 하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>체스 메이트 · 초보자를 위한 단계별 체스 입문 및 실전 대국</span>
          <span>FIDE 공식 체스 규칙 준수 (캐슬링, 앙파상, 폰 프로모션 완벽 지원)</span>
        </div>
      </footer>
    </div>
  );
}
