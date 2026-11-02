// Long-form guides: practical reading for students, written to match what the
// app actually does. Each guide is a real page with its own URL, title,
// description and Article structured data.

export type Guide = {
  slug: string;
  title: string;
  description: string;
  minutes: number;
  published: string;
  sections: { heading?: string; paragraphs: string[] }[];
};

export const guides: Guide[] = [
  {
    slug: '/pomodoro-technique',
    title: 'The Pomodoro technique for long study days',
    description: 'How timed focus blocks and short breaks help you start sooner and last longer, and how to pick a block length that suits the work in front of you.',
    minutes: 5,
    published: '2026-11-02',
    sections: [
      { paragraphs: [
        'The Pomodoro technique splits work into timed blocks separated by short breaks. Francesco Cirillo devised it as a university student in the late 1980s and named it after the tomato-shaped kitchen timer he used. The method is almost embarrassingly simple, which is exactly why it survives: there is nothing to configure before you begin.',
      ] },
      { heading: 'Why a fixed end helps you begin', paragraphs: [
        'Starting is usually harder than continuing. A block with a visible finish line turns “study chemistry” into “study chemistry until the dial reaches zero”, a promise small enough to keep on a tired evening.',
        'The break matters as much as the block. Stepping away before your attention frays means the next block starts fresh rather than half-spent, and counting finished blocks gives you an honest record of effort instead of a vague feeling of having been busy.',
      ] },
      { heading: 'Match the length to the task', paragraphs: [
        'Twenty-five minutes is a starting point, not a rule. FocusForge ships four rhythms. Sprint runs fifteen minutes with a three-minute pause, which suits flashcards or a stubborn warm-up. Classic Pomodoro keeps the original twenty-five and five. Deep Work stretches to fifty minutes with ten off, enough for a full problem set. Flow State gives ninety minutes and a twenty-minute rest for long reading or essay drafts.',
        'If none of those fit, build your own plan. A good test: you should end each block slightly wishing you could keep going, not counting the seconds.',
      ] },
      { heading: 'Make the breaks genuine', paragraphs: [
        'A break spent scrolling is not a break; it is a different kind of work that leaves you more scattered. Stand up, refill water, look at something far away. If the feed keeps calling, a focus-only rule in Shield closes the apps you choose for exactly as long as a block runs and reopens them afterwards.',
      ] },
      { heading: 'Review, then adjust', paragraphs: [
        'At the end of the week, look at how many blocks you finished per subject. Frequent abandoned blocks usually mean they are too long for the material, not that you lack discipline. Shorten them, keep the streak alive, and lengthen them again once starting feels easy.',
      ] },
    ],
  },
  {
    slug: '/block-distracting-apps',
    title: 'How to block distracting apps on Android while you study',
    description: 'Three kinds of limits, the Android permissions they rely on, and how to filter YouTube Shorts and the home feed without losing lecture videos.',
    minutes: 6,
    published: '2026-11-02',
    sections: [
      { paragraphs: [
        'Most distraction is not a decision. You unlock the phone to check one message and surface twenty minutes later. Willpower works poorly against apps engineered to keep you engaged, so the practical answer is friction: make the detour slower than the work.',
      ] },
      { heading: 'Three kinds of limit', paragraphs: [
        'Shield in FocusForge offers three rules per app. Blocked keeps an app closed all day. A daily budget allows a set number of minutes and closes the app once they run out. Focus only leaves the app alone except while a study block is running, which suits messaging apps you cannot ignore entirely.',
        'Choose the gentlest rule that still works. A blanket ban on everything tends to collapse within a week; a budget on the one app that really costs you hours usually lasts.',
      ] },
      { heading: 'The permissions, and why each one exists', paragraphs: [
        'Before Shield lists your apps, it shows a disclosure and asks you to agree. The list is read on your phone and never uploaded. To notice when a chosen app opens and how long it has been used today, Android needs Usage access. To show a pause screen over that app, it needs permission to draw over other apps.',
        'While rules are active, a notification stays in the shade with a Stop button. Every permission can be withdrawn from Android settings at any time, and the focus timer works without any of them.',
      ] },
      { heading: 'YouTube without the rabbit hole', paragraphs: [
        'YouTube is both a lecture hall and the most efficient time sink on the phone. Instead of blocking it outright, Shield can close the Shorts player and the home recommendations while direct links to videos still play. This filter uses Android Accessibility, which is requested separately and only when you switch the filter on.',
        'Because it recognises YouTube screens by their names, a YouTube update can occasionally rename them and pause the filter until FocusForge catches up.',
      ] },
      { heading: 'What blocking cannot do', paragraphs: [
        'No phone-side blocker is unbreakable. You can always stop a rule, revoke a permission or uninstall the app, and you should be able to. The aim is a speed bump with a moment to reconsider, not a cage. When you do try to open a blocked app, FocusForge offers a short breathing pause and then lets you through for a few minutes if you still want in.',
      ] },
    ],
  },
  {
    slug: '/study-habit',
    title: 'Build a study habit that lasts through exam season',
    description: 'Small daily goals, a fixed cue, weekly targets per subject and an honest weekly review: a habit plan you can keep on your worst day.',
    minutes: 5,
    published: '2026-11-02',
    sections: [
      { paragraphs: [
        'Exam season rewards whoever studies most consistently, not whoever studies hardest for a weekend. Consistency comes from a routine small enough to survive bad days, and visible enough that you notice when it slips.',
      ] },
      { heading: 'Set a goal for your worst day', paragraphs: [
        'Pick a daily target you could hit while tired, busy and unmotivated. Forty-five minutes kept every day beats four hours promised and abandoned by Wednesday. FocusForge lets you set a different goal for each weekday, so a long practical on Thursdays does not break the streak.',
      ] },
      { heading: 'Give the habit a cue', paragraphs: [
        'Habits attach to triggers: the same desk, the same hour, the same first action. Starting a block straight after dinner or right after your last lecture removes the daily negotiation about whether to begin.',
      ] },
      { heading: 'Spread effort across subjects', paragraphs: [
        'It is natural to keep studying the subject you already enjoy. A weekly target for each subject shows when one is quietly being neglected. Tag each block with its subject and the totals sort themselves out.',
      ] },
      { heading: 'Keep the streak honest', paragraphs: [
        'A streak rewards showing up, which is the part that matters. Missing a day is information, not failure; restart the next morning rather than writing off the week.',
      ] },
      { heading: 'Review on Sunday', paragraphs: [
        'Spend five minutes with the weekly chart. Which days held, which subjects slipped, which blocks were cut short? Adjust next week’s goals to match the week you actually have, then protect the first study hour of Monday with a focus-only rule before the week has a chance to fill up.',
        'Sleep and rest belong in the plan too. Material reviewed and then slept on is remembered far better than material crammed until two in the morning.',
      ] },
    ],
  },
];

export const guideFor = (path: string) => guides.find(guide => guide.slug === path);
