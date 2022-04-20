import {
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { WORDS } from 'src/app/words';

const WORD_LENGTH = 4;

const NUM_TRIES = 4;

interface Try {
  letters: Letter[];
}

interface Letter {
  text: string;
  state: LetterState;
}

const LETTERS = (() => {
  const ret: { [key: string]: boolean } = {};
  for (let charCode = 97; charCode < 97 + 26; charCode++) {
    ret[String.fromCharCode(charCode)] = true;
  }
  return ret;
})();

enum LetterState {
  WRONG,
  PARTIAL_MATCH,
  FULL_MATCH,
  PENDING,
}

@Component({
  selector: 'app-wordle',
  templateUrl: './wordle.component.html',
  styleUrls: ['./wordle.component.scss'],
})
export class WordleComponent {
  @ViewChildren('tryContainer') tryContainers!: QueryList<ElementRef>;

  tries: Try[] = [];

  currentLetterIndex = 0;

  numberSubTries = 0;

  infoMsg: string = '';

  fadeInfoMessage = false;

  targetWord = '';

  LetterState = LetterState;

  won = false;

  targetWordLetterCounts: { [letter: string]: number } = {};

  keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
  ];

  curLetterStates: { [key: string]: LetterState } = {};

  constructor() {
    //Initial state of tries.
    for (let i = 0; i < NUM_TRIES; i++) {
      const letters: Letter[] = [];
      for (let j = 0; j < WORD_LENGTH; j++) {
        letters.push({ text: '', state: LetterState.PENDING });
      }
      this.tries.push({ letters });
    }
    // Get target word from the list.
    const numWords = WORDS.length;
    while (true) {
      const index = Math.floor(Math.random() * numWords);
      const word = WORDS[index];
      if (word.length === WORD_LENGTH) {
        this.targetWord = word.toLowerCase();
        break;
      }
    }
    console.log('target word: ', this.targetWord);
    // Letter counts of target word.
    for (const letter of this.targetWord) {
      const count = this.targetWordLetterCounts[letter];
      if (count == null) {
        this.targetWordLetterCounts[letter] = 0;
      }
      this.targetWordLetterCounts[letter]++;
    }
    console.log(this.targetWordLetterCounts);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }

  handleClickKey(key: string) {
    if (this.won) {
      return;
    }
    if (LETTERS[key.toLowerCase()]) {
      if (this.currentLetterIndex < (this.numberSubTries + 1) * WORD_LENGTH) {
        this.setLetter(key);
        this.currentLetterIndex++;
      }
    } else if (key === 'Backspace') {
      if (this.currentLetterIndex > this.numberSubTries * WORD_LENGTH) {
        this.currentLetterIndex--;
        this.setLetter('');
      }
    } else if (key === 'Enter') {
      this.checkCurrentTry();
    }
  }

  setLetter(letter: string) {
    const tryIndex = Math.floor(this.currentLetterIndex / WORD_LENGTH);
    const letterIndex = this.currentLetterIndex - tryIndex * WORD_LENGTH;
    this.tries[tryIndex].letters[letterIndex].text = letter;
  }

  checkCurrentTry() {
    //Check if all letters are typed.
    const curTry = this.tries[this.numberSubTries];
    if (curTry.letters.some((letter) => letter.text === '')) {
      this.showInfoMessage('Not enough letters');
      return;
    }
    //Check if word is in list.
    const wordFromCurTry = curTry.letters
      .map((letter) => letter.text)
      .join('')
      .toUpperCase();
    if (!WORDS.includes(wordFromCurTry)) {
      this.showInfoMessage('Not in word list');
      return;
    }

    // Check if the current try matches the target word.
    const targetWordLetterCounts = { ...this.targetWordLetterCounts };
    const states: LetterState[] = [];

    for (let i = 0; i < WORD_LENGTH; i++) {
      const expected = this.targetWord[i];
      const curLetter = curTry.letters[i];
      const got = curLetter.text.toLowerCase();
      let state = LetterState.WRONG;
      // Need to make sure only performs the check when the letter has not been
      // checked before.
      if (expected === got && targetWordLetterCounts[got] > 0) {
        targetWordLetterCounts[expected]--;
        state = LetterState.FULL_MATCH;
      } else if (
        this.targetWord.includes(got) &&
        targetWordLetterCounts[got] > 0
      ) {
        targetWordLetterCounts[got]--;
        state = LetterState.PARTIAL_MATCH;
      }
      states.push(state);
    }
    console.log(states);
    //Colour the tiles
    const tryContainer = this.tryContainers.get(this.numberSubTries)
      ?.nativeElement as HTMLElement;
    const letterEles = tryContainer.querySelectorAll('.letter-container');
    for (let i = 0; i < letterEles.length; i++) {
      curTry.letters[i].state = states[i];
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
      const curLetter = curTry.letters[i];
      const got = curLetter.text.toLowerCase();
      const curStoredState = this.curLetterStates[got];
      const targetState = states[i];
      //Override with better result.
      if (curStoredState == null || targetState > curStoredState) {
        this.curLetterStates[got] = targetState;
      }
    }

    this.numberSubTries++;
    //Check if all letters are correct.
    if (states.every((state) => state === LetterState.FULL_MATCH)) {
      this.showInfoMessage('NICE!');
      this.won = true;
      return;
    }
    //Ran out of tries.
    if (this.numberSubTries === NUM_TRIES) {
      this.showInfoMessage(this.targetWord.toUpperCase(), false);
    }
  }

  showInfoMessage(msg: string, hide = true) {
    this.infoMsg = msg;

    if (hide) {
      setTimeout(() => {
        this.fadeInfoMessage = true;
        setTimeout(() => {
          this.infoMsg = '';
          this.fadeInfoMessage = false;
        }, 500);
      }, 2000);
    }
  }

  getKeyClass(key: string): string {
    const state = this.curLetterStates[key.toLowerCase()];
    switch (state) {
      case LetterState.FULL_MATCH:
        return 'match key';
      case LetterState.PARTIAL_MATCH:
        return 'partial key';
      case LetterState.WRONG:
        return 'wrong key';
      default:
        return 'key';
    }
  }
}
