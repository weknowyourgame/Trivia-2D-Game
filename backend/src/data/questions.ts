import { Question, DoorOption, DifficultyLevel } from '../types';

// Arabian Nights themed questions (in-memory database)
export const questions: Question[] = [
  {
    questionId: 'q1',
    text: 'In "Aladdin and the Magic Lamp", where did Aladdin find the magic lamp?',
    options: {
      A: 'In a cave',
      B: 'In a palace',
      C: 'In a market',
      D: 'In a desert'
    },
    correctAnswer: DoorOption.A,
    explanation: 'Aladdin found the magic lamp in a magical cave filled with treasures.',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'Aladdin'
  },
  {
    questionId: 'q2',
    text: 'How many voyages did Sinbad the Sailor complete?',
    options: {
      A: 'Five',
      B: 'Seven',
      C: 'Ten',
      D: 'Twelve'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Sinbad the Sailor completed seven legendary voyages, each filled with incredible adventures.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Sinbad'
  },
  {
    questionId: 'q3',
    text: 'What phrase does Ali Baba use to open the cave of treasures?',
    options: {
      A: 'Abracadabra',
      B: 'Open Sesame',
      C: 'Magic Door',
      D: 'Treasure Reveal'
    },
    correctAnswer: DoorOption.B,
    explanation: 'The famous phrase "Open Sesame" magically opens the door to the thieves\' treasure cave.',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'Ali Baba'
  },
  {
    questionId: 'q4',
    text: 'Who is the narrator of the Arabian Nights tales to the Sultan?',
    options: {
      A: 'Morgiana',
      B: 'Jasmine',
      C: 'Scheherazade',
      D: 'Dinarzade'
    },
    correctAnswer: DoorOption.C,
    explanation: 'Scheherazade tells stories to Sultan Shahryar each night to save her life and eventually wins his heart.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Frame Story'
  },
  {
    questionId: 'q5',
    text: 'In the story of Aladdin, what color is the genie of the lamp traditionally depicted?',
    options: {
      A: 'Red',
      B: 'Blue',
      C: 'Green',
      D: 'Purple'
    },
    correctAnswer: DoorOption.B,
    explanation: 'The Genie of the Lamp is traditionally depicted as blue, popularized by Disney\'s adaptation.',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'Aladdin'
  },
  {
    questionId: 'q6',
    text: 'How many thieves were in Ali Baba\'s story?',
    options: {
      A: 'Thirty',
      B: 'Forty',
      C: 'Fifty',
      D: 'Sixty'
    },
    correctAnswer: DoorOption.B,
    explanation: 'The story is called "Ali Baba and the Forty Thieves".',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'Ali Baba'
  },
  {
    questionId: 'q7',
    text: 'What giant bird does Sinbad encounter on his voyages?',
    options: {
      A: 'Phoenix',
      B: 'Roc',
      C: 'Eagle',
      D: 'Griffin'
    },
    correctAnswer: DoorOption.B,
    explanation: 'The Roc is a legendary giant bird from Arabian mythology that Sinbad encounters multiple times.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Sinbad'
  },
  {
    questionId: 'q8',
    text: 'What was the name of the evil sorcerer in Aladdin?',
    options: {
      A: 'Jafar',
      B: 'Maghreb',
      C: 'Mustafa',
      D: 'Hassan'
    },
    correctAnswer: DoorOption.B,
    explanation: 'In the original tale, the sorcerer was from the Maghreb (though Disney named him Jafar).',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'Aladdin'
  },
  {
    questionId: 'q9',
    text: 'Who saved Ali Baba by hiding in oil jars?',
    options: {
      A: 'His wife',
      B: 'His brother',
      C: 'Morgiana',
      D: 'The Sultan'
    },
    correctAnswer: DoorOption.C,
    explanation: 'Morgiana, Ali Baba\'s clever servant, discovered the thieves hiding in oil jars and saved her master.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Ali Baba'
  },
  {
    questionId: 'q10',
    text: 'How many wishes can be granted by Aladdin\'s genie?',
    options: {
      A: 'One',
      B: 'Three',
      C: 'Unlimited',
      D: 'Seven'
    },
    correctAnswer: DoorOption.C,
    explanation: 'In the original tale, the Genie of the Lamp could grant unlimited wishes to whoever possessed it.',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'Aladdin'
  },
  {
    questionId: 'q11',
    text: 'What is the name of Aladdin\'s mother?',
    options: {
      A: 'Fatima',
      B: 'Aminah',
      C: 'Zahra',
      D: 'Layla'
    },
    correctAnswer: DoorOption.A,
    explanation: 'Aladdin\'s mother is named Fatima in some versions of the tale.',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'Aladdin'
  },
  {
    questionId: 'q12',
    text: 'In which city does the story of Aladdin take place?',
    options: {
      A: 'Baghdad',
      B: 'Cairo',
      C: 'Damascus',
      D: 'A city in China'
    },
    correctAnswer: DoorOption.D,
    explanation: 'Surprisingly, the original tale places Aladdin in a city in China, though it has Arabian elements.',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'Aladdin'
  },
  {
    questionId: 'q13',
    text: 'What does Sinbad throw at the Old Man of the Sea to escape?',
    options: {
      A: 'Rocks',
      B: 'Wine',
      C: 'Fire',
      D: 'Sand'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Sinbad gets the Old Man drunk with wine, causing him to fall off, allowing Sinbad to escape.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Sinbad'
  },
  {
    questionId: 'q14',
    text: 'How long did Scheherazade tell stories to the Sultan?',
    options: {
      A: '100 nights',
      B: '365 nights',
      C: '1001 nights',
      D: '7 nights'
    },
    correctAnswer: DoorOption.C,
    explanation: 'The collection is called "One Thousand and One Nights" after the duration of Scheherazade\'s storytelling.',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'Frame Story'
  },
  {
    questionId: 'q15',
    text: 'What profession was Ali Baba?',
    options: {
      A: 'Merchant',
      B: 'Woodcutter',
      C: 'Sailor',
      D: 'Prince'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Ali Baba was a poor woodcutter who stumbled upon the thieves\' cave while working.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Ali Baba'
  },
  {
    questionId: 'q16',
    text: 'What happens to Ali Baba\'s brother Cassim?',
    options: {
      A: 'He becomes rich',
      B: 'He is killed by thieves',
      C: 'He becomes a king',
      D: 'He disappears'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Cassim is caught and killed by the forty thieves when he forgets the magic phrase to exit the cave.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Ali Baba'
  },
  {
    questionId: 'q17',
    text: 'What does the magic carpet allow people to do?',
    options: {
      A: 'Become invisible',
      B: 'Travel through time',
      C: 'Fly',
      D: 'Change shape'
    },
    correctAnswer: DoorOption.C,
    explanation: 'The magic carpet is famous for allowing people to fly through the air.',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'General'
  },
  {
    questionId: 'q18',
    text: 'Which island does Sinbad discover where diamonds are found in a valley of snakes?',
    options: {
      A: 'First voyage',
      B: 'Second voyage',
      C: 'Third voyage',
      D: 'Fifth voyage'
    },
    correctAnswer: DoorOption.B,
    explanation: 'During his second voyage, Sinbad discovers the Valley of Diamonds guarded by giant snakes.',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'Sinbad'
  },
  {
    questionId: 'q19',
    text: 'What type of creature is the Roc\'s natural prey?',
    options: {
      A: 'Fish',
      B: 'Elephants',
      C: 'Camels',
      D: 'Serpents'
    },
    correctAnswer: DoorOption.B,
    explanation: 'The Roc is so massive that it preys on elephants, which it carries in its talons.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Sinbad'
  },
  {
    questionId: 'q20',
    text: 'What saves Scheherazade from being executed by the Sultan?',
    options: {
      A: 'A magic spell',
      B: 'Her storytelling',
      C: 'A rescue party',
      D: 'The Sultan\'s advisor'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Scheherazade saves herself by telling captivating stories each night, leaving them unfinished to ensure she lives another day.',
    difficultyLevel: DifficultyLevel.EASY,
    theme: 'Frame Story'
  },
  {
    questionId: 'q21',
    text: 'What item does Aladdin use to summon the Genie of the Ring?',
    options: {
      A: 'A necklace',
      B: 'A ring',
      C: 'A bracelet',
      D: 'An amulet'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Before finding the lamp, Aladdin receives a magic ring from the sorcerer that summons a different genie.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Aladdin'
  },
  {
    questionId: 'q22',
    text: 'In the original tales, who actually added the Aladdin story to Arabian Nights?',
    options: {
      A: 'A Persian poet',
      B: 'A French translator',
      C: 'An Arab scholar',
      D: 'An Indian writer'
    },
    correctAnswer: DoorOption.B,
    explanation: 'Antoine Galland, a French translator, added Aladdin to his translation of Arabian Nights in the 18th century.',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'General'
  },
  {
    questionId: 'q23',
    text: 'What was Sinbad\'s profession before becoming a sailor?',
    options: {
      A: 'He inherited wealth',
      B: 'Merchant',
      C: 'Fisherman',
      D: 'Soldier'
    },
    correctAnswer: DoorOption.A,
    explanation: 'Sinbad was born wealthy but squandered his inheritance, leading him to become a sailor to rebuild his fortune.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Sinbad'
  },
  {
    questionId: 'q24',
    text: 'How does Morgiana mark the houses of the other citizens to save Ali Baba?',
    options: {
      A: 'With red paint',
      B: 'With chalk marks',
      C: 'With identical marks',
      D: 'With flowers'
    },
    correctAnswer: DoorOption.C,
    explanation: 'Morgiana cleverly marks all the houses in the neighborhood with the same symbol to confuse the thieves.',
    difficultyLevel: DifficultyLevel.HARD,
    theme: 'Ali Baba'
  },
  {
    questionId: 'q25',
    text: 'What is the name of the Sultan who marries Scheherazade?',
    options: {
      A: 'Shahryar',
      B: 'Harun',
      C: 'Saladin',
      D: 'Omar'
    },
    correctAnswer: DoorOption.A,
    explanation: 'Sultan Shahryar is the king who initially plans to execute Scheherazade but falls in love with her stories.',
    difficultyLevel: DifficultyLevel.MEDIUM,
    theme: 'Frame Story'
  }
];

export function getRandomQuestions(count: number): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length));
}

export function getQuestionById(id: string): Question | undefined {
  return questions.find(q => q.questionId === id);
}

