import {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react"

import "./App.css"

import {
  boardDefault,
  boardStatusDefault,
  computeGuessStatus,
  generateAcceptableWordSet,
  generateMainWordSet,
  getRandomItemFromSet,
  LetterStatus,
} from "./helpers"
import Board from "./components/Board"
import Keyboard from "./components/Keyboard"
import GameOver from "./components/GameOver"
import BotBoard from "./components/BotBoard"

export interface IWordleGameContext {
  board: string[][]
  setBoard: Dispatch<SetStateAction<string[][]>>
  boardStatus: LetterStatus[][]
  setBoardStatus: Dispatch<SetStateAction<LetterStatus[][]>>
  currAttempt: { attempt: number; letterPos: number }
  setCurrAttempt: Dispatch<
    SetStateAction<{ attempt: number; letterPos: number }>
  >
  onDelete: () => void
  onEnter: () => void
  onSelectLetter: (key: string) => void
  correctWord: string
  letterStatus: Map<string, LetterStatus>
  setLetterStatus: Dispatch<SetStateAction<Map<string, LetterStatus>>>
  gameOver: { gameOver: boolean; guessedWord: boolean }
  setGameOver: Dispatch<
    SetStateAction<{ gameOver: boolean; guessedWord: boolean }>
  >
}

export const AppContext = createContext<IWordleGameContext>(
  {} as IWordleGameContext
)

function App() {
  const [board, setBoard] = useState(boardDefault)
  const [boardStatus, setBoardStatus] = useState(boardStatusDefault)
  const [currAttempt, setCurrAttempt] = useState({
    attempt: 0,
    letterPos: 0,
  })
  const [wordSet, setWordSet] = useState(new Set())
  const [letterStatus, setLetterStatus] = useState(new Map())
  const [gameOver, setGameOver] = useState({
    gameOver: false,
    guessedWord: false,
  })
  const [botWon, setBotWon] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const [correctWord, setCorrectWord] = useState("")

  // generate set once (by empty deps)
  useEffect(() => {
    // this is the word bank of acceptable words
    generateAcceptableWordSet().then((words) => {
      setWordSet(words.wordSet)
    })
  }, [])

  const startNewGame = () => {
    // Generate new word
    generateMainWordSet().then((wordsy) => {
      const newWord = getRandomItemFromSet(wordsy.wordSet)
      setCorrectWord(newWord)
      
      // Reset game state
      setBoard(boardDefault)
      setBoardStatus(boardStatusDefault)
      setCurrAttempt({ attempt: 0, letterPos: 0 })
      setLetterStatus(new Map())
      setGameOver({ gameOver: false, guessedWord: false })
      setBotWon(false)
      setGameStarted(true)
    })
  }

  const onSelectLetter = (key: string) => {
    if (currAttempt.letterPos >= 5 || !gameStarted) return
    const newBoard = [...board]
    newBoard[currAttempt.attempt][currAttempt.letterPos] = key
    setBoard(newBoard)
    setCurrAttempt({ ...currAttempt, letterPos: currAttempt.letterPos + 1 })
  }

  const onDelete = () => {
    if (currAttempt.letterPos === 0 || !gameStarted) return
    const newBoard = [...board]
    newBoard[currAttempt.attempt][currAttempt.letterPos - 1] = ""
    setBoard(newBoard)
    setCurrAttempt({ ...currAttempt, letterPos: currAttempt.letterPos - 1 })
  }

  const onEnter = () => {
    if (currAttempt.letterPos !== 5 || !gameStarted) return

    let currWord = board[currAttempt.attempt].join("").toUpperCase()
    if (!wordSet.has(currWord)) return alert("Word not found")

    // compute the status of the letters
    const newBoardStatus = [...boardStatus]
    newBoardStatus[currAttempt.attempt] = computeGuessStatus(
      currWord,
      correctWord
    )
    setBoardStatus(newBoardStatus)

    // defining here because it won't be refreshed after the setCurrAttempt
    const nextAttemptCount = currAttempt.attempt + 1

    setCurrAttempt({
      attempt: nextAttemptCount,
      letterPos: 0,
    })

    if (currWord === correctWord) {
      setGameOver({
        gameOver: true,
        guessedWord: true,
      })
    } else if (nextAttemptCount === 6) {
      setGameOver({
        gameOver: true,
        guessedWord: false,
      })
    }
  }

  const handleBotWin = () => {
    setBotWon(true)
  }

  return (
    <div className="App">
      <nav>
        <h1>Wordle</h1>
      </nav>
      <AppContext.Provider
        value={{
          board,
          setBoard,
          boardStatus,
          setBoardStatus,
          currAttempt,
          setCurrAttempt,
          onDelete,
          onEnter,
          onSelectLetter,
          correctWord,
          letterStatus,
          setLetterStatus,
          gameOver,
          setGameOver,
        }}
      >
        {!gameStarted ? (
          <div className="start-screen">
            <div className="start-content">
              <h2>Welcome to Wordle!</h2>
              <p>Race against the bot to guess the 5-letter word</p>
              <button onClick={startNewGame} className="start-button">
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="game-container">
              <div className="player-section">
                <div className="section-header">
                  <h2>👤 You</h2>
                  {gameOver.guessedWord && <span className="win-badge">Won!</span>}
                  {gameOver.gameOver && !gameOver.guessedWord && <span className="lost-badge">Lost</span>}
                </div>
                <div className="game">
                  <Board />
                  {gameOver.gameOver ? <GameOver /> : <Keyboard />}
                </div>
              </div>
              
              <div className="bot-section">
                <BotBoard 
                  correctWord={correctWord} 
                  playerAttempt={currAttempt.attempt}
                  onBotWin={handleBotWin}
                  gameStarted={gameStarted}
                />
              </div>
            </div>
            
            {gameOver.gameOver && (
              <div className="game-controls">
                <button onClick={startNewGame} className="new-game-button">
                  New Game
                </button>
              </div>
            )}
            
            {botWon && gameOver.guessedWord && (
              <div className="result-banner tie">
                🤝 It's a tie!
              </div>
            )}
            {botWon && !gameOver.guessedWord && (
              <div className="result-banner bot-wins">
                🤖 Bot wins!
              </div>
            )}
            {!botWon && gameOver.guessedWord && (
              <div className="result-banner player-wins">
                🎉 You win!
              </div>
            )}
          </>
        )}
      </AppContext.Provider>
    </div>
  )
}

export default App
