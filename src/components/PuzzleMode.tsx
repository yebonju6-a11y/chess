import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import confetti from 'canvas-confetti';
import { BEGINNER_PUZZLES, Puzzle } from '../data/puzzles';
import { ChessPiece } from './ChessPiece';
import { sounds } from '../utils/audio';
import { CheckCircle2, RotateCcw, Lightbulb, ChevronRight, Award, HelpCircle } from 'lucide-react';

interface PuzzleModeProps {
  onBackToPlay?: () => void;
}

export const PuzzleMode: React.FC<PuzzleModeProps> = ({ onBackToPlay }) => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const puzzle: Puzzle = BEGINNER_PUZZLES[currentIdx];

  const [game, setGame] = useState<Chess>(new Chess(puzzle.fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'neutral' | 'success' | 'error'; text: string }>({
    type: 'neutral',
    text: puzzle.description,
  });
  const [showHint, setShowHint] = useState<boolean>(false);

  // Reset puzzle state when index changes
  const resetPuzzle = useCallback((p: Puzzle) => {
    setGame(new Chess(p.fen));
    setSelectedSquare(null);
    setValidMoves([]);
    setIsSolved(false);
    setShowHint(false);
    setStatusMessage({ type: 'neutral', text: p.description });
  }, []);

  useEffect(() => {
    resetPuzzle(puzzle);
  }, [puzzle, resetPuzzle]);

  const handleSquareClick = (square: Square) => {
    if (isSolved) return;

    const piece = game.get(square);

    // If already selected, check if clicked square is a move
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      // Check if move is legal
      const legalMoves = game.moves({ square: selectedSquare, verbose: true });
      const moveAttempt = legalMoves.find((m) => m.to === square);

      if (moveAttempt) {
        // Execute move
        const expectedMove = puzzle.solutionMoves[0];
        const isSolution = selectedSquare === expectedMove.from && square === expectedMove.to;

        try {
          const moveResult = game.move({ from: selectedSquare, to: square, promotion: 'q' });
          if (moveResult) {
            setGame(new Chess(game.fen()));
            setSelectedSquare(null);
            setValidMoves([]);

            if (moveResult.captured) {
              sounds.playCapture();
            } else {
              sounds.playMove();
            }

            if (isSolution) {
              sounds.playVictory();
              confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 },
              });
              setIsSolved(true);
              setStatusMessage({
                type: 'success',
                text: '정답입니다! 완벽한 수였습니다.',
              });
            } else {
              sounds.playUndo();
              setStatusMessage({
                type: 'error',
                text: '합법적인 수이지만 정답 전술이 아닙니다. 다시 시도해 보세요!',
              });
              // Reset after 1 second
              setTimeout(() => {
                resetPuzzle(puzzle);
              }, 1200);
            }
            return;
          }
        } catch {
          // invalid
        }
      }
    }

    // Select piece if it belongs to player
    if (piece && piece.color === puzzle.playerColor) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }).map((m) => m.to as Square);
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const handleNextPuzzle = () => {
    if (currentIdx < BEGINNER_PUZZLES.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Loop or finish
      setCurrentIdx(0);
    }
  };

  const board = game.board();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top clean controls bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">초보자 전술 연습</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>
              문제 {currentIdx + 1} / {BEGINNER_PUZZLES.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>{puzzle.category}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToPlay && (
            <button
              onClick={onBackToPlay}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              대국으로 돌아가기
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Puzzle Board View */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[420px] aspect-square rounded-xl overflow-hidden shadow-md border-4 border-amber-900/40 relative bg-amber-50">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const squareName = (String.fromCharCode(97 + cIdx) + (8 - rIdx)) as Square;
                  const isDark = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selectedSquare === squareName;
                  const isValidTarget = validMoves.includes(squareName);
                  const isTargetCapture = isValidTarget && cell !== null;

                  return (
                    <button
                      key={squareName}
                      onClick={() => handleSquareClick(squareName)}
                      aria-label={squareName}
                      className={`relative w-full h-full flex items-center justify-center p-0.5 transition-colors select-none ${
                        isDark ? 'bg-amber-800/80' : 'bg-amber-100'
                      } ${isSelected ? 'ring-3 ring-amber-400 inset-0 z-10' : ''}`}
                    >
                      {/* Board coordinate labels on edges */}
                      {cIdx === 0 && (
                        <span
                          className={`absolute top-0.5 left-1 text-[10px] font-semibold leading-none select-none ${
                            isDark ? 'text-amber-200/70' : 'text-amber-900/60'
                          }`}
                        >
                          {8 - rIdx}
                        </span>
                      )}
                      {rIdx === 7 && (
                        <span
                          className={`absolute bottom-0.5 right-1 text-[10px] font-semibold leading-none select-none ${
                            isDark ? 'text-amber-200/70' : 'text-amber-900/60'
                          }`}
                        >
                          {String.fromCharCode(97 + cIdx)}
                        </span>
                      )}

                      {/* Piece SVG */}
                      {cell && (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChessPiece type={cell.type} color={cell.color} />
                        </div>
                      )}

                      {/* Valid move target dots */}
                      {isValidTarget && !isTargetCapture && (
                        <div className="absolute w-3 h-3 rounded-full bg-emerald-600/75 pointer-events-none ring-2 ring-emerald-300" />
                      )}
                      {isTargetCapture && (
                        <div className="absolute inset-1 rounded-full border-2 border-rose-500 bg-rose-500/20 pointer-events-none" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-full max-w-[420px] flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>백(White)의 차례입니다. 최선의 수를 두세요.</span>
            <button
              onClick={() => resetPuzzle(puzzle)}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>다시 시도</span>
            </button>
          </div>
        </div>

        {/* Puzzle Instructions & Solution Feedback Panel */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-amber-700 font-medium">{puzzle.category}</span>
                <span className="text-xs text-slate-400">레벨 1 입문</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{puzzle.title}</h3>
            </div>

            {/* Instruction / Status Banner */}
            <div
              className={`p-3.5 rounded-lg text-xs leading-relaxed border transition-colors ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {statusMessage.text}
            </div>

            {/* Hint Box */}
            {showHint ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>코치의 힌트</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">{puzzle.hint}</p>
              </div>
            ) : (
              !isSolved && (
                <button
                  onClick={() => setShowHint(true)}
                  className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>힌트 보기</span>
                </button>
              )
            )}

            {/* Explanation when solved */}
            {isSolved && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>전술 해설</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{puzzle.explanation}</p>

                <button
                  onClick={handleNextPuzzle}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  <span>다음 문제 도전</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Puzzle Selector Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" /> 다른 연습 문제 선택
            </span>
            <div className="space-y-1.5">
              {BEGINNER_PUZZLES.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                    idx === currentIdx
                      ? 'bg-amber-100 text-amber-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="truncate">
                    {idx + 1}. {p.title}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0 ml-2">{p.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
