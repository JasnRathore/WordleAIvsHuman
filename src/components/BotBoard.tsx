import React, { useState, useEffect, useCallback } from 'react';
import { computeGuessStatus, generateAcceptableWordSet, generateMainWordSet } from '../helpers';

const getLetterFrequency = (words: Set<string>) => {
  const freq: { [key: string]: number } = {};
  words.forEach(word => {
    const seen = new Set();
    for (const letter of word) {
      if (!seen.has(letter)) {
        freq[letter] = (freq[letter] || 0) + 1;
        seen.add(letter);
      }
    }
  });
  return freq;
};

const getPositionalLetterFrequency = (words: Set<string>) => {
  const freq: { [pos: number]: { [letter: string]: number } } = {};
  for (let i = 0; i < 5; i++) freq[i] = {};
  words.forEach(word => {
    for (let i = 0; i < 5; i++) {
      const letter = word[i];
      freq[i][letter] = (freq[i][letter] || 0) + 1;
    }
  });
  return freq;
};

const scoreWord = (
  word: string, 
  overallFreq: { [key: string]: number }, 
  positionalFreq: { [pos: number]: { [letter: string]: number } }, 
  remainingWords: Set<string>
) => {
  const seen = new Set();
  let score = 0;
  for (let i = 0; i < 5; i++) {
    const letter = word[i];
    if (!seen.has(letter)) {
      const posFreq = positionalFreq[i][letter] || 0;
      const ovFreq = overallFreq[letter] || 0;
      score += ovFreq * 0.4 + posFreq * 0.6;
      seen.add(letter);
    }
  }
  const uniqueLetters = new Set(word).size;
  score *= (uniqueLetters / 5);
  if (remainingWords.size > 10 && uniqueLetters < 5) score *= 0.8;
  return score;
};

interface BotBoardProps {
  correctWord: string;
  playerAttempt: number;
  onBotWin?: () => void;
  gameStarted: boolean;
}

const BotBoard: React.FC<BotBoardProps> = ({ correctWord, playerAttempt, onBotWin, gameStarted }) => {
  const [botBoard, setBotBoard] = useState<string[][]>(
    Array(6).fill(null).map(() => Array(5).fill(''))
  );
  const [botStatus, setBotStatus] = useState<number[][]>(
    Array(6).fill(null).map(() => Array(5).fill(0))
  );
  const [possibleWords, setPossibleWords] = useState<Set<string>>(new Set());
  const [botAttempt, setBotAttempt] = useState(0);
  const [botWon, setBotWon] = useState(false);
  const [botLost, setBotLost] = useState(false);
  const [wordList, setWordList] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateAcceptableWordSet().then((words) => {
      setPossibleWords(words.wordSet)
    });

    generateMainWordSet().then((words) => {
      setWordList(words.wordSet);
    });
  }, []);

  const filterWords = useCallback((words: Set<string>, guess: string, result: number[]): Set<string> => {
    const next = new Set<string>();
    words.forEach(word => {
      const testResult = computeGuessStatus(guess, word);
      if (testResult.every((status, i) => status === result[i])) {
        next.add(word);
      }
    });
    return next;
  }, []);

  const selectBestGuess = useCallback((words: Set<string>, currentAttempt: number): string => {
    if (words.size === 0) return 'AROSE';
    if (words.size === 1) return [...words][0];

    const wordArray = Array.from(words);
    if (currentAttempt === 0) {
      const optimalStarts = ['SALET', 'REAST', 'CRATE', 'TRACE', 'SLATE', 'AROSE'];
      for (const start of optimalStarts) if (words.has(start)) return start;
    }

    const overallFreq = getLetterFrequency(words);
    const positionalFreq = getPositionalLetterFrequency(words);

    let bestWord = wordArray[0];
    let bestScore = scoreWord(bestWord, overallFreq, positionalFreq, words);
    const checkLimit = Math.min(wordArray.length, 100);

    for (let i = 0; i < checkLimit; i++) {
      const word = wordArray[i];
      const score = scoreWord(word, overallFreq, positionalFreq, words);
      if (score > bestScore) {
        bestScore = score;
        bestWord = word;
      }
    }
    return bestWord;
  }, []);

  const makeBotGuess = useCallback(() => {
    if (botWon || botLost || botAttempt >= 6 || !gameStarted) return;
    const guess = selectBestGuess(possibleWords, botAttempt);
    const result = computeGuessStatus(guess, correctWord);

    const newBoard = [...botBoard];
    newBoard[botAttempt] = guess.split('');
    setBotBoard(newBoard);

    const newStatus = [...botStatus];
    newStatus[botAttempt] = result;
    setBotStatus(newStatus);

    const newAttempt = botAttempt + 1;
    setBotAttempt(newAttempt);

    if (result.every(s => s === 4)) {
      setBotWon(true);
      onBotWin?.();
    } else if (newAttempt >= 6) {
      setBotLost(true);
    } else {
      const filtered = filterWords(possibleWords, guess, result);
      setPossibleWords(filtered);
    }
  }, [botBoard, botStatus, botAttempt, possibleWords, correctWord, botWon, botLost, gameStarted, filterWords, selectBestGuess, onBotWin]);

  useEffect(() => {
    if (gameStarted && correctWord && playerAttempt > botAttempt && !botWon && !botLost && wordList.size > 0) {
      const timer = setTimeout(() => makeBotGuess(), 500);
      return () => clearTimeout(timer);
    }
  }, [playerAttempt, botAttempt, correctWord, botWon, botLost, wordList, gameStarted, makeBotGuess]);

  useEffect(() => {
    if (!gameStarted) {
      setBotBoard(Array(6).fill(null).map(() => Array(5).fill('')));
      setBotStatus(Array(6).fill(null).map(() => Array(5).fill(0)));
      setBotAttempt(0);
      setBotWon(false);
      setBotLost(false);
      setPossibleWords(new Set(wordList));
    }
  }, [gameStarted, wordList]);

  const getLetterClass = (attemptVal: number, letterPos: number) => {
    const letter = botBoard[attemptVal][letterPos];
    if (!letter) return "letter";
    if (botAttempt > attemptVal) {
      const status = botStatus[attemptVal][letterPos];
      if (status === 2) return "letter almost";
      if (status === 4) return "letter correct";
      if (status === 1) return "letter error";
    }
    return "letter";
  };

  return (
    <div className="bot-container">
      <div className="bot-header">
        <h2>🤖 Bot Player</h2>
        {botWon && <span className="bot-status win">Won!</span>}
        {botLost && <span className="bot-status lost">Lost</span>}
        {!botWon && !botLost && possibleWords.size > 0 && possibleWords.size <= 50 && (
          <span className="bot-status thinking">{possibleWords.size} possible</span>
        )}
      </div>
      <div className="board">
        {[0, 1, 2, 3, 4, 5].map((attemptVal) => (
          <div className="row" key={attemptVal}>
            {[0, 1, 2, 3, 4].map((letterPos) => (
              <div className={getLetterClass(attemptVal, letterPos)} key={letterPos}>
                {botBoard[attemptVal][letterPos]}
              </div>
            ))}
          </div>
        ))}
      </div>
      {possibleWords.size > 0 && possibleWords.size <= 10 && !botWon && !botLost && (
        <div className="possible-words">
          <small>Possible: {[...possibleWords].join(', ')}</small>
        </div>
      )}
    </div>
  );
};

export default BotBoard;
