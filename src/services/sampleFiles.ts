/**
 * Sample Test Files & Templates for EduSpace25 Question Importer
 */

import * as XLSX from 'xlsx';

export const SAMPLE_TEXT_SUITE = `Question 1: Mark enjoys _______ English songs in his free time.
A. listening to
B. to listen
C. listen
D. listened
Answer: A
Explanation: Enjoy + V-ing: Mark enjoys listening to English songs.

Question 2: She has been living in Da Nang _______ 2018.
A. for
B. since
C. in
D. at
Answer: B
Explanation: Use 'since' with a specific point in time in the past for present perfect continuous.

Question 3: If Peter studied harder, he _______ higher scores in the national exam.
A. will get
B. gets
C. would get
D. got
Answer: C
Explanation: Second conditional clause: If + past simple, S + would + V_inf.

Question 4: Renewable energy sources such as solar and wind power are environmentally _______.
A. friendly
B. friend
C. friendship
D. friendliness
Answer: A
Explanation: Adverb 'environmentally' modifies the adjective 'friendly'.

Question 5: Which planet in our solar system is known as the Red Planet?
A. Venus
B. Mars
C. Jupiter
D. Saturn
Answer: B
Explanation: Mars is referred to as the Red Planet due to iron oxide on its surface.

Question 6: Water boils at 100 degrees Celsius under standard atmospheric conditions.
A. True
B. False
C. Uncertain
D. None of the above
Answer: A
Explanation: Standard boiling point of water at 1 atm is 100°C.

Question 7: By the time we arrived at the cinema yesterday, the movie _______.
A. already started
B. had already started
C. has already started
D. was starting
Answer: B
Explanation: Past perfect tense (had + V3/ed) indicates an action completed before another past action.

Question 8: The national high school graduation exam is organized _______ June every year.
A. on
B. in
C. at
D. to
Answer: B
Explanation: Use preposition 'in' before months (in June).

Question 9: The teacher asked the students to _______ attention to the grammar instructions.
A. pay
B. make
C. give
D. take
Answer: A
Explanation: Collocation: 'pay attention to' means to listen or watch carefully.

Question 10: Although he was tired, he finished his assignment before going to bed.
A. Despite of being tired
B. In spite of his tiredness
C. Because he was tired
D. As he was tired
Answer: B
Explanation: 'In spite of + noun phrase' replaces 'Although + clause'.
`;

export function downloadSampleExcel() {
  const data = [
    {
      Question: "What is the opposite of 'cheap'?",
      A: "expensive",
      B: "small",
      C: "easy",
      D: "slow",
      Answer: "A",
      Explanation: "'Expensive' is the opposite of 'cheap'.",
      Unit: "Unit 1",
      Lesson: "Vocabulary",
      Level: "Easy",
    },
    {
      Question: "The students _______ to school every day.",
      A: "go",
      B: "goes",
      C: "went",
      D: "going",
      Answer: "A",
      Explanation: "Subject-verb agreement for plural noun in simple present.",
      Unit: "Unit 1",
      Lesson: "Grammar",
      Level: "Easy",
    },
    {
      Question: "Which city is the capital of France?",
      A: "London",
      B: "Paris",
      C: "Berlin",
      D: "Madrid",
      Answer: "Paris",
      Explanation: "Paris has been the capital of France since the 10th century.",
      Unit: "Unit 2",
      Lesson: "General Knowledge",
      Level: "Easy",
    },
    {
      Question: "If it rains tomorrow, we _______ the outdoor picnic.",
      A: "cancel",
      B: "will cancel",
      C: "canceled",
      D: "would cancel",
      Answer: "B",
      Explanation: "First conditional: If + present simple, will + V_inf.",
      Unit: "Unit 3",
      Lesson: "Conditionals",
      Level: "Medium",
    },
    {
      Question: "Sample question with missing answer to test Review Required:",
      A: "Option One",
      B: "Option Two",
      C: "Option Three",
      D: "Option Four",
      Answer: "",
      Explanation: "Teacher can set the correct answer in the preview table.",
      Unit: "Unit 4",
      Lesson: "Review",
      Level: "Medium",
    },
    {
      Question: "What is the chemical symbol for Gold?",
      A: "Ag",
      B: "Au",
      C: "Fe",
      D: "Pb",
      Answer: "Au",
      Explanation: "Au is derived from the Latin word 'aurum'.",
      Unit: "Science",
      Lesson: "Elements",
      Level: "Medium",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

  XLSX.writeFile(workbook, 'EduSpace25_Question_Import_Template.xlsx');
}

export function downloadSampleCsv() {
  const csvContent =
    'Question,A,B,C,D,Answer,Explanation,Unit,Lesson,Level\n' +
    '"What is the opposite of \'cheap\'?","expensive","small","easy","slow","A","\'Expensive\' is the opposite of \'cheap\'.","Unit 1","Vocabulary","Easy"\n' +
    '"The students _______ to school every day.","go","goes","went","going","A","Subject-verb agreement.","Unit 1","Grammar","Easy"\n' +
    '"Which planet is closest to the Sun?","Mercury","Venus","Earth","Mars","Mercury","Mercury is the smallest and closest planet to the Sun.","Unit 2","Science","Easy"\n' +
    '"Sample missing answer question","Option A","Option B","Option C","Option D","","Review test","Unit 3","Practice","Medium"\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'EduSpace25_Sample_Questions.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleWordText() {
  const blob = new Blob([SAMPLE_TEXT_SUITE], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'EduSpace25_Word_Question_Format.txt');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
