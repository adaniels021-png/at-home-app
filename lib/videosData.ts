export type VideoCategory = 'Communication' | 'Sensory' | 'Fun Learning' | 'Favorites';

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnail: string;
  category: Exclude<VideoCategory, 'Favorites'>;
  ageRange: string;
  parentTip: string;
  week: number;
};

export const VIDEO_CATEGORIES: readonly VideoCategory[] = [
  'Communication',
  'Sensory',
  'Fun Learning',
  'Favorites',
];

/**
 * Calculates the current rotation week based on safe UTC date boundaries.
 * This avoids time-of-day shifting bugs caused by comparing raw timestamps.
 */
export function getCurrentRotationWeek(totalWeeks = 6): number {
  const now = new Date();
  
  // Establish strict midnight UTC timestamps to calculate reliable day diffs
  const utcNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const utcStart = Date.UTC(now.getFullYear(), 0, 1);

  const diffDays = Math.floor((utcNow - utcStart) / (1000 * 60 * 60 * 24));

  return (Math.floor(diffDays / 7) % totalWeeks) + 1;
}

export const FAVORITES_KEY = 'video_hub_favorites';

export const VIDEOS: readonly VideoItem[] = [
  // ==================== WEEK 1 ====================
  {
    id: 'communication-w1-1',
    week: 1,
    category: 'Communication',
    title: 'Pablo – How Are You?',
    description:
      'A beautifully calm cartoon voiced by autistic individuals that helps children understand feelings and greetings.',
    youtubeUrl: 'https://www.youtube.com/watch?v=rx4Po9DS5DA',
    thumbnail: 'https://img.youtube.com/vi/rx4Po9DS5DA/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Watch along later and model simple visual feeling cards matching Pablo’s mood.',
  },
  {
    id: 'communication-w1-2',
    week: 1,
    category: 'Communication',
    title: 'Super Simple Songs – Clean Up Song',
    description:
      'A predictable, highly repetitive song that helps establish chore routines and transition expectations.',
    youtubeUrl: 'https://www.youtube.com/watch?v=oY-H2WGThc8',
    thumbnail: 'https://img.youtube.com/vi/oY-H2WGThc8/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Play this track whenever it is time to transition from playtime to clean-up time.',
  },
  {
    id: 'sensory-w1-1',
    week: 1,
    category: 'Sensory',
    title: 'Amazing Things Happen – Autism Explained',
    description:
      'The globally acclaimed gentle introduction to sensory differences, unique perspectives, and peer understanding.',
    youtubeUrl: 'https://www.youtube.com/watch?v=NWZQEoIzBsA',
    thumbnail: 'https://img.youtube.com/vi/NWZQEoIzBsA/hqdefault.jpg',
    ageRange: 'Ages 4–10',
    parentTip:
      'Great for family teaching. Emphasize how certain everyday sounds can feel much louder to others.',
  },
  {
    id: 'sensory-w1-2',
    week: 1,
    category: 'Sensory',
    title: 'Calming Fluid Simulation Loop',
    description:
      'A slow-moving, visually hypnotic sensory loop designed to reduce overload and assist de-escalation.',
    youtubeUrl: 'https://www.youtube.com/watch?v=sY0N0egXh8Q',
    thumbnail: 'https://img.youtube.com/vi/sY0N0egXh8Q/hqdefault.jpg',
    ageRange: 'All Ages',
    parentTip:
      'Perfect to use as a quiet tool inside a sensory corner or dim room to help lower heart rates.',
  },
  {
    id: 'fun-w1-1',
    week: 1,
    category: 'Fun Learning',
    title: 'Ms. Rachel – Speech and Language Practice',
    description:
      'Enmeshed with slow pacing, clear mouth modeling, sign language, and simple developmental speech frames.',
    youtubeUrl: 'https://www.youtube.com/watch?v=hTqtGJwsJVE',
    thumbnail: 'https://img.youtube.com/vi/hTqtGJwsJVE/hqdefault.jpg',
    ageRange: 'Ages 1–5',
    parentTip:
      'Notice how Ms. Rachel pauses for several seconds—copy this style when waiting for your child to respond.',
  },
  {
    id: 'fun-w1-2',
    week: 1,
    category: 'Fun Learning',
    title: 'Super Simple Songs – Walking in the Jungle',
    description:
      'An engaging motion and listening song that introduces animal movements and spatial vocabulary.',
    youtubeUrl: 'https://www.youtube.com/watch?v=GoSq-yZcJ-4',
    thumbnail: 'https://img.youtube.com/vi/GoSq-yZcJ-4/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Encourage motor imitation by stepping or making animal sounds along with the music track.',
  },

  // ==================== WEEK 2 ====================
  {
    id: 'communication-w2-1',
    week: 2,
    category: 'Communication',
    title: 'The Hi, Hello Greeting Song',
    description:
      'A bright social interaction melody supporting basic greetings, waving, and fundamental turn-taking cues.',
    youtubeUrl: 'https://www.youtube.com/watch?v=T-wvRTDieGQ',
    thumbnail: 'https://img.youtube.com/vi/T-wvRTDieGQ/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Practice waving or exchanging greeting gestures each time the chorus line comes back around.',
  },
  {
    id: 'communication-w2-2',
    week: 2,
    category: 'Communication',
    title: 'How Do We Say Hello?',
    description:
      'A structured preschool social melody introducing alternative greeting routines (wave, high five, smile).',
    youtubeUrl: 'https://www.youtube.com/watch?v=p3XPRgf4qG4',
    thumbnail: 'https://img.youtube.com/vi/p3XPRgf4qG4/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Pause the stream and prompt your child to use their preferred communication tool to say hello.',
  },
  {
    id: 'sensory-w2-1',
    week: 2,
    category: 'Sensory',
    title: 'Breathe Like a Butterfly Calm',
    description:
      'A visual deep breathing sequence matching physical wing extensions to regulate high-stress levels.',
    youtubeUrl: 'https://www.youtube.com/watch?v=3jmDVNaI3uU',
    thumbnail: 'https://img.youtube.com/vi/3jmDVNaI3uU/hqdefault.jpg',
    ageRange: 'Ages 3–8',
    parentTip:
      'Practice extending your arms wide like wings to match the visual pacing with your child.',
  },
  {
    id: 'sensory-w2-2',
    week: 2,
    category: 'Sensory',
    title: 'Deep Breathing Visual Bubble Timer',
    description:
      'A non-verbal calming visual track tracking floating bubbles to prompt slow, steady exhalations.',
    youtubeUrl: 'https://www.youtube.com/watch?v=MHFG8JR_ueI',
    thumbnail: 'https://img.youtube.com/vi/MHFG8JR_ueI/hqdefault.jpg',
    ageRange: 'All Ages',
    parentTip:
      'Pair this loop with real bubble jars at home to bridge abstract visuals with tangible tracking.',
  },
  {
    id: 'fun-w2-1',
    week: 2,
    category: 'Fun Learning',
    title: 'Treetop Family – Safe Calm Exploration',
    description:
      'A meticulously paced animated cartoon with a muted palette, designed specifically for gentle attention engagement.',
    youtubeUrl: 'https://www.youtube.com/watch?v=SNzirLwzs_0',
    thumbnail: 'https://img.youtube.com/vi/SNzirLwzs_0/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'An exceptional baseline option if your child gets easily overstimulated by fast, flashing animations.',
  },
  {
    id: 'fun-w2-2',
    week: 2,
    category: 'Fun Learning',
    title: 'Daniel Tiger – Sharing Interaction',
    description:
      'A safe social narrative lesson focusing on the emotional routines of sharing and collaborative play.',
    youtubeUrl: 'https://www.youtube.com/watch?v=Zx92MUYdtgU',
    thumbnail: 'https://img.youtube.com/vi/Zx92MUYdtgU/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Reinforce the verbal scripts from the show when your child is sharing objects later.',
  },

  // ==================== WEEK 3 ====================
  {
    id: 'communication-w3-1',
    week: 3,
    category: 'Communication',
    title: 'Good Manners Social Story Song',
    description:
      'A simple, highly explicit musical breakdown explaining functional phrases like please and thank you.',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZbSZCBYKfHk',
    thumbnail: 'https://img.youtube.com/vi/ZbSZCBYKfHk/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Pick just one social phrase targeted by the show to emphasize during family meals.',
  },
  {
    id: 'communication-w3-2',
    week: 3,
    category: 'Communication',
    title: 'Turn-Taking Dialogue Practice',
    description:
      'An educational social-skills layout framing the rhythm of conversation and conversational waiting.',
    youtubeUrl: 'https://www.youtube.com/watch?v=JscDaqa1z5Y',
    thumbnail: 'https://img.youtube.com/vi/JscDaqa1z5Y/hqdefault.jpg',
    ageRange: 'Ages 4–8',
    parentTip:
      'Practice functional turn-taking with a token or a physical toy immediately after viewing.',
  },
  {
    id: 'sensory-w3-1',
    week: 3,
    category: 'Sensory',
    title: 'Count and Breathe Regulation Loop',
    description:
      'A numerical breathing script that introduces a predictable pacing rhythm for processing big feelings.',
    youtubeUrl: 'https://www.youtube.com/watch?v=n66r5Y6wguc',
    thumbnail: 'https://img.youtube.com/vi/n66r5Y6wguc/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Count along aloud to show how counting can help create structured control over frustration.',
  },
  {
    id: 'sensory-w3-2',
    week: 3,
    category: 'Sensory',
    title: 'Abby Cadabby – Safe Bubble Breathing',
    description:
      'An imaginative and soothing animation using visualization to anchor self-regulation skills.',
    youtubeUrl: 'https://www.youtube.com/watch?v=o9w8oXmEO04',
    thumbnail: 'https://img.youtube.com/vi/o9w8oXmEO04/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Prompt your child to show their "big bubble belly" when they are inhaling deeply.',
  },
  {
    id: 'fun-w3-1',
    week: 3,
    category: 'Fun Learning',
    title: 'Bluey – Sleepytime Narrative',
    description:
      'A highly acclaimed, soothing sequence built around routines, emotional security, and calming imagery.',
    youtubeUrl: 'https://www.youtube.com/watch?v=TxoqJ0Pmux0',
    thumbnail: 'https://img.youtube.com/vi/TxoqJ0Pmux0/hqdefault.jpg',
    ageRange: 'Ages 2–8',
    parentTip:
      'An excellent wind-down or transition option right before preparing for bedtime schedules.',
  },
  {
    id: 'fun-w3-2',
    week: 3,
    category: 'Fun Learning',
    title: 'Pinkfong – Identifying My Emotions',
    description:
      'A bright melody mapping expressions and feelings vocabulary onto clear characters.',
    youtubeUrl: 'https://www.youtube.com/watch?v=GQFWg0hafIA',
    thumbnail: 'https://img.youtube.com/vi/GQFWg0hafIA/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Have your child point to their own cheek or jaw to mimic the emotional expressions on screen.',
  },

  // ==================== WEEK 4 ====================
  {
    id: 'communication-w4-1',
    week: 4,
    category: 'Communication',
    title: 'Asking for Help Social Script',
    description:
      'An actionable social song coaching kids on how to state when they are stuck and need support.',
    youtubeUrl: 'https://www.youtube.com/watch?v=1MJsz7mStoA',
    thumbnail: 'https://img.youtube.com/vi/1MJsz7mStoA/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Practice setting up easy challenges at home where your child can use their "Help please" tool.',
  },
  {
    id: 'communication-w4-2',
    week: 4,
    category: 'Communication',
    title: 'Please and Thank You Melodies',
    description:
      'Enmeshed with highly repetitive audio phrasing to make social scripts predictable and natural.',
    youtubeUrl: 'https://www.youtube.com/watch?v=2hjG7Jr4Y3M',
    thumbnail: 'https://img.youtube.com/vi/2hjG7Jr4Y3M/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Praise functional communication immediately when these targeted scripts are used during snacks.',
  },
  {
    id: 'sensory-w4-1',
    week: 4,
    category: 'Sensory',
    title: 'Mindful Breathing Visual Pattern',
    description:
      'An expanding geometric flower framework that models pacing rules for calming breath retention.',
    youtubeUrl: 'https://www.youtube.com/watch?v=wf5K3pP2IUQ',
    thumbnail: 'https://img.youtube.com/vi/wf5K3pP2IUQ/hqdefault.jpg',
    ageRange: 'Ages 4–8',
    parentTip:
      'Use this geometry pattern to help visually anchor timing concepts for breathing exercises.',
  },
  {
    id: 'sensory-w4-2',
    week: 4,
    category: 'Sensory',
    title: 'Rainbow Soothing Relaxation Space',
    description:
      'A slow ambient canvas rotation crafted to minimize sensory fatigue and restore focus.',
    youtubeUrl: 'https://www.youtube.com/watch?v=O29e4rRMrV4',
    thumbnail: 'https://img.youtube.com/vi/O29e4rRMrV4/hqdefault.jpg',
    ageRange: 'All Ages',
    parentTip:
      'Lower the device brightness level to maximize the relaxing visual properties of this stream.',
  },
  {
    id: 'fun-w4-1',
    week: 4,
    category: 'Fun Learning',
    title: 'Freeze Dance – Inhibition Game',
    description:
      'An interactive physical game designed to strengthen attention control and response inhibition.',
    youtubeUrl: 'https://www.youtube.com/watch?v=388Q44ReOWE',
    thumbnail: 'https://img.youtube.com/vi/388Q44ReOWE/hqdefault.jpg',
    ageRange: 'Ages 2–7',
    parentTip:
      'Model freezing completely still to emphasize listening and impulse control skills.',
  },
  {
    id: 'fun-w4-2',
    week: 4,
    category: 'Fun Learning',
    title: 'The Kiboomers – Animal Imitation',
    description:
      'A dynamic movement piece focusing on gross motor imitation through fun animal characters.',
    youtubeUrl: 'https://www.youtube.com/watch?v=p5qw9lSIJuo',
    thumbnail: 'https://img.youtube.com/vi/p5qw9lSIJuo/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Celebrate all movement attempts, even partial approximations or creative variations.',
  },

  // ==================== WEEK 5 ====================
  {
    id: 'communication-w5-1',
    week: 5,
    category: 'Communication',
    title: 'The Feelings Matching Song',
    description:
      'A narrative tool matching clear cartoon emotional faces to situational triggers.',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZxfJicfyCdg',
    thumbnail: 'https://img.youtube.com/vi/ZxfJicfyCdg/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Encourage pointing behavior to let non-verbal children identify relevant feelings.',
  },
  {
    id: 'communication-w5-2',
    week: 5,
    category: 'Communication',
    title: 'Learn to Listen Direction Practice',
    description:
      'A step-by-step listening framework detailing actionable ways to follow short directions.',
    youtubeUrl: 'https://www.youtube.com/watch?v=mGTXttPLUQ4',
    thumbnail: 'https://img.youtube.com/vi/mGTXttPLUQ4/hqdefault.jpg',
    ageRange: 'Ages 3–7',
    parentTip:
      'Keep your everyday instructions down to simple 1-step directives to build consistency.',
  },
  {
    id: 'sensory-w5-1',
    week: 5,
    category: 'Sensory',
    title: 'Cosmic Kids – Safe Sensory Stretching',
    description:
      'A calm interactive movement journey linking imaginative stories with motor integration exercises.',
    youtubeUrl: 'https://www.youtube.com/watch?v=R-BS87NTV5I',
    thumbnail: 'https://img.youtube.com/vi/R-BS87NTV5I/hqdefault.jpg',
    ageRange: 'Ages 3–8',
    parentTip:
      'Let your child engage at their own comfort level—the goal is comfortable muscle feedback.',
  },
  {
    id: 'sensory-w5-2',
    week: 5,
    category: 'Sensory',
    title: 'Calm Down Starfish Aquarium Loop',
    description:
      'A peaceful visual tracking sequence showing drifting fish and coral reefs for soothing overstimulation.',
    youtubeUrl: 'https://www.youtube.com/watch?v=lFcSrYw-ARY',
    thumbnail: 'https://img.youtube.com/vi/lFcSrYw-ARY/hqdefault.jpg',
    ageRange: 'All Ages',
    parentTip:
      'An ideal visual anchor during high-stress moments or periods of environmental distress.',
  },
  {
    id: 'fun-w5-1',
    week: 5,
    category: 'Fun Learning',
    title: 'Super Simple – Count to 20 Rhythms',
    description:
      'A slow numerical counting progression backed by repetitive musical phrases for rote sequence memory.',
    youtubeUrl: 'https://www.youtube.com/watch?v=0VLxWIHRD4E',
    thumbnail: 'https://img.youtube.com/vi/0VLxWIHRD4E/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Generalize this skill by counting out small snacks or toys together later.',
  },
  {
    id: 'fun-w5-2',
    week: 5,
    category: 'Fun Learning',
    title: 'The Clean Up Routine Framework',
    description:
      'A catchy musical transition cue built around organizing toys and predicting schedule steps.',
    youtubeUrl: 'https://www.youtube.com/watch?v=KZdipcMG_cU',
    thumbnail: 'https://img.youtube.com/vi/KZdipcMG_cU/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Using the identical transition track daily helps map a reliable routine for your child.',
  },

  // ==================== WEEK 6 ====================
  {
    id: 'communication-w6-1',
    week: 6,
    category: 'Communication',
    title: 'What’s Your Name? Social Dialogue',
    description:
      'A structured social dialogue video focusing on responding to direct personal questions.',
    youtubeUrl: 'https://www.youtube.com/watch?v=BAFSTrSNJMg',
    thumbnail: 'https://img.youtube.com/vi/BAFSTrSNJMg/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Practice modeling name responses using stuffed animals to keep it interactive.',
  },
  {
  id: 'communication-w6-2',
  week: 6,
  category: 'Communication',
  title: 'Sound Imitation Practice',
  description:
    'A simple speech and imitation video that encourages children to copy sounds, words, and early communication attempts.',
  youtubeUrl: 'https://www.youtube.com/watch?v=hTqtGJwsJVE',
  thumbnail: 'https://img.youtube.com/vi/hTqtGJwsJVE/hqdefault.jpg',
  ageRange: 'Ages 1–5',
  parentTip:
    'Pause often and celebrate any sound, gesture, sign, or communication attempt your child makes.',
},
  {
  id: 'sensory-w6-1',
  week: 6,
  category: 'Sensory',
  title: 'Belly Breathing Calm Practice',
  description:
    'A gentle breathing exercise that helps children practice slow belly breathing for calming the body and mind.',
  youtubeUrl: 'https://www.youtube.com/watch?v=7Ep5mKuRmAA',
  thumbnail: 'https://img.youtube.com/vi/7Ep5mKuRmAA/hqdefault.jpg',
  ageRange: 'Ages 3–8',
  parentTip:
    'Practice when your child is already calm first, so the breathing routine feels familiar during hard moments.',
},
  {
    id: 'sensory-w6-2',
    week: 6,
    category: 'Sensory',
    title: 'Soft Ambient Classical Tracking Visuals',
    description:
      'Extremely gentle symphonic tempos combined with slow nature progressions to ease system tension.',
    youtubeUrl: 'https://www.youtube.com/watch?v=cHdNB6zqewU',
    thumbnail: 'https://img.youtube.com/vi/cHdNB6zqewU/hqdefault.jpg',
    ageRange: 'All Ages',
    parentTip:
      'Highly effective for sensory cool-down phases or accompanying independent resting spaces.',
  },
  {
    id: 'fun-w6-1',
    week: 6,
    category: 'Fun Learning',
    title: 'Head, Shoulders, Knees, and Toes',
    description:
      'A classic structural movement framework optimizing physical tracking, coordination, and body plane awareness.',
    youtubeUrl: 'https://www.youtube.com/watch?v=h4eueDYPTIg',
    thumbnail: 'https://img.youtube.com/vi/h4eueDYPTIg/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      'Slow the sequence steps down manually at home if your child requires more processing time.',
  },
  {
    id: 'fun-w6-2',
    week: 6,
    category: 'Fun Learning',
    title: 'The ABC Identification Song',
    description:
      'A clearly enunciated alphabet sequence mapping auditory letter names onto bold, stable visual assets.',
    youtubeUrl: 'https://www.youtube.com/watch?v=75p-N9YKqNo',
    thumbnail: 'https://img.youtube.com/vi/75p-N9YKqNo/hqdefault.jpg',
    ageRange: 'Ages 2–6',
    parentTip:
      "Trace printed letters with your child's finger to add a tactical component to learning letters.",
  },
];