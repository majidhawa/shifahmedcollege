'use client';

import { useState } from 'react';

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

const questions: Question[] = [
  {
    question:
      'You see someone suddenly collapse and they do not respond when you speak to them. What should you do first?',
    options: [
      'Leave them alone and wait',
      'Check responsiveness and call for emergency help',
      'Give them water',
      'Help them stand up',
    ],
    correctAnswer: 1,
    explanation:
      'Check whether the person responds and get emergency help activated as quickly as possible.',
  },

  {
    question:
      'A person is unresponsive and not breathing normally. What should happen next?',
    options: [
      'Wait several minutes to see if they recover',
      'Give them something to drink',
      'Call emergency services and begin CPR if you are trained',
      'Move them to a chair',
    ],
    correctAnswer: 2,
    explanation:
      'An unresponsive person who is not breathing normally needs immediate emergency assistance. CPR should be started by a trained responder while emergency help is being activated.',
  },

  {
    question:
      'Why is early recognition of a cardiac emergency important?',
    options: [
      'Because emergencies usually resolve on their own',
      'Because early action can improve the chances of a better outcome',
      'Because it prevents every heart condition',
      'Because medical professionals are not needed afterward',
    ],
    correctAnswer: 1,
    explanation:
      'Recognizing an emergency early allows appropriate help to be activated without unnecessary delay.',
  },

  {
    question:
      'If an AED is available during a suspected cardiac arrest, what is it designed to do?',
    options: [
      'Measure blood sugar',
      'Give medication automatically',
      'Analyze the heart rhythm and, when appropriate, advise or deliver a shock',
      'Replace CPR completely',
    ],
    correctAnswer: 2,
    explanation:
      'An AED analyzes the heart rhythm and, when indicated, provides instructions and may deliver a shock. Follow the device prompts and continue CPR as instructed.',
  },

  {
    question:
      'What is one important thing a bystander can do while waiting for professional emergency help?',
    options: [
      'Keep the emergency secret',
      'Follow the instructions of the emergency dispatcher and provide appropriate assistance',
      'Give the person random medication',
      'Drive away immediately',
    ],
    correctAnswer: 1,
    explanation:
      'Emergency dispatchers can provide instructions while professional help is on the way. Follow their guidance and provide only appropriate assistance.',
  },
];

export default function HeartEmergencyQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const question = questions[currentQuestion];
  const answered = selectedAnswer !== null;

  const handleAnswer = (answerIndex: number) => {
    if (answered) return;

    setSelectedAnswer(answerIndex);

    if (answerIndex === question.correctAnswer) {
      setScore((previousScore) => previousScore + 1);
    }
  };

  const handleNext = () => {
    if (!answered) return;

    if (currentQuestion === questions.length - 1) {
      setShowResult(true);
      return;
    }

    setCurrentQuestion((previousQuestion) => previousQuestion + 1);
    setSelectedAnswer(null);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
  };

  const getResultMessage = () => {
    const finalScore = score;

    if (finalScore === 5) {
      return {
        title: 'Excellent!',
        message:
          'You have a strong understanding of some important emergency-response principles. Keep learning and encourage others to become prepared too.',
      };
    }

    if (finalScore >= 3) {
      return {
        title: 'Good Start!',
        message:
          'You have some useful emergency-response knowledge. There is always more to learn when it comes to being prepared for an emergency.',
      };
    }

    return {
      title: 'Keep Learning!',
      message:
        'Emergency preparedness is a skill that can be learned. Take this opportunity to learn more about appropriate first-response principles.',
    };
  };

  if (showResult) {
    const result = getResultMessage();

    return (
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-6">

        <div
          className="
            overflow-hidden
            rounded-[2rem]
            border
            border-white/10
            bg-white/[0.04]
            p-7
            text-center
            shadow-[0_25px_80px_rgba(0,0,0,0.25)]
            sm:p-10
          "
        >

          <div className="text-5xl">
            {score >= 3 ? '❤️' : '🫀'}
          </div>

          <p
            className="
              mt-5
              text-[10px]
              font-black
              uppercase
              tracking-[0.25em]
              text-brand-gold
            "
          >
            Your Result
          </p>

          <h3 className="mt-3 text-3xl font-black">
            {result.title}
          </h3>

          <div className="mt-6">

            <span
              className="
                inline-flex
                items-center
                rounded-full
                border
                border-brand-gold/20
                bg-brand-gold/10
                px-5
                py-2
                text-lg
                font-black
                text-brand-gold
              "
            >
              {score} / {questions.length}
            </span>

          </div>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/55">
            {result.message}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

            <button
              type="button"
              onClick={restartQuiz}
              className="
                rounded-full
                border
                border-white/10
                bg-white/5
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition
                hover:bg-white/10
              "
            >
              Try Again
            </button>

            <a
              href="/programs/emt"
              className="
                rounded-full
                bg-brand-green
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition
                hover:bg-brand-gold
                hover:text-brand-dark
              "
            >
              Explore EMT Training
            </a>

          </div>

        </div>

      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-6">

      {/* HEADER */}

      <div className="text-center">

        <div
          className="
            mx-auto
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-brand-gold/10
            text-2xl
          "
        >
          🫀
        </div>

        <p
          className="
            mt-5
            text-[10px]
            font-black
            uppercase
            tracking-[0.25em]
            text-brand-gold
          "
        >
          Test Yourself
        </p>

        <h2
          className="
            mt-3
            text-3xl
            font-black
            tracking-tight
            sm:text-4xl
          "
        >
          Would You Know What To Do?
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/50">
          Take this quick five-question challenge and test your
          understanding of basic emergency-response principles.
        </p>

      </div>


      {/* PROGRESS */}

      <div className="mt-10">

        <div className="flex items-center justify-between">

          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Question {currentQuestion + 1} of {questions.length}
          </span>

          <span className="text-[10px] font-bold text-brand-gold">
            {Math.round(
              ((currentQuestion + 1) / questions.length) * 100
            )}
            %
          </span>

        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">

          <div
            className="
              h-full
              rounded-full
              bg-brand-gold
              transition-all
              duration-500
            "
            style={{
              width: `${
                ((currentQuestion + 1) / questions.length) * 100
              }%`,
            }}
          />

        </div>

      </div>


      {/* QUESTION CARD */}

      <div
        className="
          mt-6
          rounded-[2rem]
          border
          border-white/10
          bg-white/[0.04]
          p-6
          sm:p-8
        "
      >

        <h3
          className="
            text-xl
            font-black
            leading-8
            text-white
            sm:text-2xl
          "
        >
          {question.question}
        </h3>


        {/* ANSWERS */}

        <div className="mt-7 space-y-3">

          {question.options.map((option, index) => {

            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctAnswer;

            let answerClass =
              'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]';

            if (answered && isCorrect) {
              answerClass =
                'border-brand-green/50 bg-brand-green/10 text-white';
            }

            if (answered && isSelected && !isCorrect) {
              answerClass =
                'border-red-400/40 bg-red-400/10 text-white';
            }

            return (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswer(index)}
                disabled={answered}
                className={`
                  flex
                  w-full
                  items-start
                  gap-4
                  rounded-2xl
                  border
                  px-4
                  py-4
                  text-left
                  text-sm
                  font-semibold
                  transition
                  ${answerClass}
                `}
              >

                <span
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white/10
                    text-xs
                    font-black
                  "
                >
                  {String.fromCharCode(65 + index)}
                </span>

                <span className="pt-1">
                  {option}
                </span>

              </button>
            );
          })}

        </div>


        {/* EXPLANATION */}

        {answered && (
          <div
            className="
              mt-5
              rounded-2xl
              border
              border-white/10
              bg-black/10
              p-4
            "
          >

            <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold">
              {selectedAnswer === question.correctAnswer
                ? 'Correct'
                : 'Good Question'}
            </p>

            <p className="mt-2 text-sm leading-6 text-white/55">
              {question.explanation}
            </p>

          </div>
        )}


        {/* NEXT */}

        <button
          type="button"
          onClick={handleNext}
          disabled={!answered}
          className="
            mt-6
            w-full
            rounded-full
            bg-brand-green
            px-6
            py-3.5
            text-sm
            font-bold
            text-white
            transition
            hover:bg-brand-gold
            hover:text-brand-dark
            disabled:cursor-not-allowed
            disabled:opacity-30
          "
        >
          {currentQuestion === questions.length - 1
            ? 'See My Result'
            : 'Next Question'}
        </button>

      </div>


      {/* DISCLAIMER */}

      <p className="mt-5 text-center text-[10px] leading-5 text-white/30">
        This quiz is for general awareness and education. It is not
        a substitute for professional first-aid or emergency medical
        training. In a real emergency, contact your local emergency
        service and follow dispatcher instructions.
      </p>

    </section>
  );
}
