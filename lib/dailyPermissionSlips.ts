export type PermissionSlipCategory =
  | 'survival'
  | 'connection'
  | 'joy'
  | 'guilt';

export type PermissionSlip = {
  id: string;
  category: PermissionSlipCategory;
  title: string;
  permission: string;
  micro: string;
  mini: string;
  macro: string;
  why: string;
};

export function getCategoryLabel(category: PermissionSlipCategory): string {
  switch (category) {
    case 'survival':
      return 'Survival Mode';
    case 'connection':
      return 'Connection';
    case 'joy':
      return 'Joy';
    case 'guilt':
      return 'Guilt Release';
    default: {
      const _exhaustiveCheck: never = category;
      return 'Permission';
    }
  }
}

// ==========================================
// DATASET (Consolidated & Refined)
// ==========================================

export const ALL_PERMISSION_SLIPS: PermissionSlip[] = [
  // ------------------------------------------
  // PART 1: SURVIVAL
  // ------------------------------------------
  {
    id: 'surv-1',
    category: 'survival',
    title: 'Permission to pause the "therapy homework"',
    permission: 'You do not have to turn every single meltdown, interaction, or playtime into a clinical learning milestone. Tonight can just be about basic safety and peace.',
    micro: 'Tell yourself out loud: "I am a parent, not their therapist."',
    mini: 'Put the PECS cards, speech targets, or behavioral charts away for the next 2 hours.',
    macro: 'Declare tonight a maintenance night. Safe comfort items, lower expectations, no unnecessary battles, and zero guilt.',
    why: 'Co-regulation often matters more than skill practice in hard moments. A calm parent is the best neurodivergent support tool.'
  },
  {
    id: 'surv-2',
    category: 'survival',
    title: 'Permission to serve the same exact safe food (again)',
    permission: 'If they are eating chicken nuggets, dry cereal, or a specific brand of crackers for the fourth time today, let them. A full belly is better than a dinnertime battlefield.',
    micro: 'Close your eyes and breathe out the intrusive thought that you are failing their nutrition.',
    mini: 'Microwave the safe food, put it on their favorite plate, and walk away from the table to breathe.',
    macro: 'Commit to a zero-demand meal routine tonight: repetitive familiar food, no tracking bites, no sensory pressure.',
    why: 'Nutrition is a long-term landscape, not a single evening crisis. Feeding peace protects everyone’s nervous system.'
  },
  {
    id: 'surv-3',
    category: 'survival',
    title: 'Permission to exist alongside the mess',
    permission: 'The lined-up toys, the sensory bin spill on the rug, and the unwashed dishes are not signs of failure. Your remaining energy is finite.',
    micro: 'Look at one specific mess, say "not today," and visually look away.',
    mini: 'Clear a 3-foot safety pathway so nobody trips, then ignore the remaining clutter completely.',
    macro: 'Step entirely out of the room with the worst mess, close the door, and refuse to touch it until tomorrow morning.',
    why: 'A spotless house won\'t prevent a midnight sensory meltdown, but an emotionally depleted caregiver will make it harder to handle.'
  },
  {
    id: 'surv-4',
    category: 'survival',
    title: 'Permission to simplify bedtime',
    permission: 'If everyone is dysregulated and running on empty, a complex 8-step visual bedtime routine is a recipe for an explosive evening.',
    micro: 'Pick the absolute bare minimum step required for sleep.',
    mini: 'Skip the bath, skip the hairbrushing, and substitute teeth wiping or skip it completely for one single night.',
    macro: 'Execute the survival bedtime: Diaper/pajamas on, favorite weighted blanket/plushie, lights off, sound machine up. Done.',
    why: 'Consistency is valuable, but recognizing when a routine has become a compliance trap protects your child\'s sense of bedtime safety.'
  },
  {
    id: 'surv-5',
    category: 'survival',
    title: 'Permission to lean heavily on digital co-regulators',
    permission: 'Handing over the iPad, turning on their favorite repetitive YouTube loop, or relying on screen time to keep things stable does not make you a lazy parent.',
    micro: 'Drop your shoulders as you hand over the device. No internal apologizing.',
    mini: 'Use a high-interest screen or sensory video loop now, *before* your child hits full escalation.',
    macro: 'Build a low-stress 2-hour buffer zone where screens do the heavy lifting so your own nervous system can step down from high alert.',
    why: 'Screens are not a cop-out; they are a highly predictable, low-demand sensory environment that can prevent catastrophic nervous system crashes.'
  },
  {
    id: 'surv-6',
    category: 'survival',
    title: 'Permission to block out the noise',
    permission: 'Your adult auditory system has limits. You are allowed to reduce the volume of vocal stimming, crashing, and high-pitch screaming before you feel overwhelmed.',
    micro: 'Drop your jaw, loosen your teeth, and lower the volume of your own speech.',
    mini: 'Put in your Loop earplugs, noise-canceling headphones, or over-ear defenders right now.',
    macro: 'Institute a low-auditory block of time: turn off background TVs, quiet toys go into rotation, and everyone uses low-demand visuals.',
    why: 'You cannot successfully co-regulate a dysregulated child if their sensory output is actively triggering your own fight-or-flight response.'
  },
  {
    id: 'surv-7',
    category: 'survival',
    title: 'Permission to execute a tactical retreat',
    permission: 'You do not have to stand directly over a screaming or flailing child absorbing the impact. If they are physically safe, you are allowed to step away.',
    micro: 'Plant your feet flat on the floor and put your hands over your own heart.',
    mini: 'Step into the hallway, bathroom, or kitchen for 90 seconds. Close your eyes and count to 10.',
    macro: 'Set up a completely secure sensory space for your child, step out, and allow both of you to de-escalate independently without interference.',
    why: 'Adding more intensity to an overwhelmed nervous system can make it harder for everyone to calm.'
  },
  {
    id: 'surv-8',
    category: 'survival',
    title: 'Permission to pull the emergency brake and cancel plans',
    permission: 'If your child woke up dysregulated, or your own inner battery is in the red, you are allowed to abort plans, social outings, or errands at the absolute last minute.',
    micro: 'Unclench your stomach muscles and admit: "We don\'t have the capacity today."',
    mini: 'Call or text to cancel or postpone the immediate next obligation without over-explaining your reasons.',
    macro: 'Convert today from a "performance and execution" day into an intentional home-based recovery day for everyone.',
    why: 'Pushing through an empty battery to avoid letting down outsiders almost always ends in a severe, multi-day burnout crash.'
  },
  {
    id: 'surv-9',
    category: 'survival',
    title: 'Permission to completely ignore public stares',
    permission: 'When a meltdown happens in public, bystanders see a snapshot. You know the whole baseline. Their opinion is not your emergency.',
    micro: 'Lock your eyes directly on your child\'s face. Blur out the surrounding room.',
    mini: 'Take a deep breath and tell yourself: "I am parenting the child in front of me, not the audience around me."',
    macro: 'Prioritize your child\'s regulation completely—even if that means leaving a full cart of items right where it stands and walking out.',
    why: 'Unsolicited opinions don\'t live your life or deal with the emotional fallout at 2:00 AM. Their comfort is irrelevant.'
  },
  {
    id: 'surv-10',
    category: 'survival',
    title: 'Permission to buy duplicates of the hyperfixation outfit',
    permission: 'If they only want to wear one specific tagless, soft texture shirt, you do not have to fight the sensory battle of forcing variety today.',
    micro: 'Accept that clothing variety is not the goal right now.',
    mini: 'Log online and order three more copies of the exact same shirt or pants.',
    macro: 'Clear out any complex clothing options from their drawer this week to remove early morning clothing standoff anxieties entirely.',
    why: 'Sensory ease beats fashion standards every single day of the week.'
  },
  {
    id: 'surv-11',
    category: 'survival',
    title: 'Permission to let pajamas be daywear',
    permission: 'If the physical transition of changing out of pajamas triggers an hour-long meltdown sequence before you even leave the house, skip it.',
    micro: 'Take a deep breath and look at the pajamas as simply clothes.',
    mini: 'Ensure the pajamas are clean enough for comfort, and declare them the outfit for the day.',
    macro: 'Spend the whole day at home without a single clothing transition request, keeping sensory demands at zero.',
    why: 'Forcing a non-essential clothing change when capacity is low drains energy needed for much bigger moments.'
  },
  {
    id: 'surv-12',
    category: 'survival',
    title: 'Permission to choose disposable options',
    permission: 'You do not have to be an eco-warrior or a domestic champion every day. Paper plates and plastic utensils are valid survival tools.',
    micro: 'Throw away a single paper plate without analyzing it.',
    mini: 'Switch to easy cleanup tools for the next 24 hours to give yourself a break from the sink.',
    macro: 'Stock your pantry with emergency survival mealware so you have an automated out on low-battery days.',
    why: 'Your psychological energy is a finite resource. Protect it from the dish cycle.'
  },
  {
    id: 'surv-13',
    category: 'survival',
    title: 'Permission to leave the text on read',
    permission: 'You do not owe friends, caseworkers, or extended family members instant updates on how therapy went or how your child is doing.',
    micro: 'Turn off notification badges for your text messages right now.',
    mini: 'Close the app and tell yourself: "I will respond when my battery is above ten percent."',
    macro: 'Put your phone in Do Not Disturb mode for the afternoon and focus entirely on your own immediate environment.',
    why: 'Constantly translating your unique family life for outsiders is an exhaustion generator.'
  },
  {
    id: 'surv-14',
    category: 'survival',
    title: 'Permission to use a safe distraction loop',
    permission: 'Setting up a highly predictable sensory visual loop so you can take a shower or eat a meal in absolute peace is good caregiving.',
    micro: 'Hand over the sensory device without an internal apology.',
    mini: 'Set a timer for 15 minutes and step away to do something purely for your own body.',
    macro: 'Create a daily routine window where a highly structured screen activity gives you predictable, guaranteed autonomy.',
    why: 'You cannot co-regulate a child when your own physiological basic needs are entirely neglected.'
  },
  {
    id: 'surv-15',
    category: 'survival',
    title: 'Permission to say no to the family gathering',
    permission: 'If an upcoming holiday or party is packed with bright lights, loud noises, and relatives who offer unsolicited advice, you are allowed to stay home.',
    micro: 'Decide right now that your family’s nervous systems come first.',
    mini: 'Send a polite, brief text declining the invitation without providing a defense case.',
    macro: 'Plan a cozy, low-demand alternative day at home where everyone stays regulated and safe.',
    why: 'Protecting your child from a sensory crash is a far greater act of love than keeping up appearances.'
  },
  {
    id: 'surv-16',
    category: 'survival',
    title: 'Permission to skip the haircut tracking',
    permission: 'If sensory aversion to clippers, scissors, or being touched makes haircuts an absolute nightmare, you can let their hair grow out.',
    micro: 'Look at their hair and choose to find it charmingly long.',
    mini: 'Postpone the upcoming trim appointment without rescheduling it immediately.',
    macro: 'Decide to put haircuts on pause for the next two months to remove a massive recurring flashpoint.',
    why: 'Hair grows back; trust and sensory safety are much harder to rebuild.'
  },
  {
    id: 'surv-17',
    category: 'survival',
    title: 'Permission to buy pre-prepped foods',
    permission: 'You do not need to cook everything from scratch to be a good parent. Pre-cut fruits, frozen nuggets, and packaged snacks are completely acceptable.',
    micro: 'Drop the guilt as you open a pre-packaged snack box.',
    mini: 'Fill your shopping cart with options that require zero cutting, peeling, or stove time.',
    macro: 'Plan a week of entirely pre-assembled or heat-and-serve meals to give your kitchen stamina a rest.',
    why: 'The energy saved on food prep is energy you can spend on staying calm during an evening transition.'
  },
  {
    id: 'surv-18',
    category: 'survival',
    title: 'Permission to use the car as a sensory break room',
    permission: 'If the house feels too intense but you can’t go anywhere, buckles and a driving routine can sometimes provide safe, predictable movement.',
    micro: 'Put your keys in your pocket without an explicit destination.',
    mini: 'Load up for a 15-minute aimless drive with their favorite auditory track playing loop-style.',
    macro: 'Use a long car ride as a sensory reset block where the predictable containment helps both of you step down from red alert.',
    why: 'Enclosed spaces and rhythmic road motion provide automatic, low-demand deep pressure inputs.'
  },
{
  id: 'guilt-1',
  category: 'guilt',
  title: 'Permission to stop comparing your child',
  permission:
    'Your child is not behind someone else’s child. They are moving through the world with a completely different nervous system and timeline.',
  micro: 'Say quietly: "Comparison is not data."',
  mini: 'Close the app, post, or conversation that made you feel behind.',
  macro:
    'Spend tonight measuring progress only against your child’s own baseline, not another family’s highlight reel.',
  why:
    'Comparison creates false failure. Your child deserves to be seen through their own growth pattern.',
},
{
  id: 'guilt-2',
  category: 'guilt',
  title: 'Permission to stop blaming yourself',
  permission:
    'You did not cause your child’s hard day, sensory needs, communication delays, or meltdown. This is not a parenting character flaw.',
  micro: 'Put one hand on your chest and say: "This is not my fault."',
  mini: 'Write down one thing you handled today that required real patience.',
  macro:
    'Let yourself release the idea that better parenting would erase every hard moment.',
  why:
    'Guilt drains the energy you need for actual support. Compassion gives that energy back.',
},
{
  id: 'guilt-3',
  category: 'guilt',
  title: 'Permission to not explain autism today',
  permission:
    'You do not owe every stranger, relative, or observer an autism education lesson when you are already managing the moment.',
  micro: 'Let one comment pass without responding.',
  mini: 'Use one short phrase: "This is what works for us."',
  macro:
    'Protect your energy by refusing to defend your child’s needs to people who are not trying to understand.',
  why:
    'Advocacy matters, but constant explanation can become emotional labor that burns caregivers out.',
},
{
  id: 'guilt-4',
  category: 'guilt',
  title: 'Permission to stop chasing every therapy',
  permission:
    'You do not have to enroll in every program, buy every workbook, or try every intervention to prove you are doing enough.',
  micro: 'Close one tab or email about a new therapy option.',
  mini: 'Ask: "Does this actually fit our family capacity right now?"',
  macro:
    'Pause all new therapy research for one week and focus only on what is already working.',
  why:
    'More services are not always better. Sustainable support beats overloaded intervention.',
},
{
  id: 'guilt-5',
  category: 'guilt',
  title: 'Permission to be proud of today',
  permission:
    'Even if today looked messy, loud, repetitive, or unfinished, you still showed up inside a very demanding parenting reality.',
  micro: 'Name one thing you did today that helped your child feel safer.',
  mini: 'Write one sentence: "Today was hard, and I still showed up."',
  macro:
    'End the night by honoring your effort instead of auditing your mistakes.',
  why:
    'Parents need emotional reinforcement too. Pride is not arrogance; it is fuel.',
},

  // ------------------------------------------
  // PART 1: CONNECTION & JOY
  // ------------------------------------------
  {
    id: 'conn-1',
    category: 'connection',
    title: 'Permission to drop the correction',
    permission: 'Not every odd, repetitive, or slightly inconvenient behavior needs a verbal boundary or redirect. If it is safe and regulates them, let it ride.',
    micro: 'Watch them stim or play for 30 seconds without saying a single word of direction.',
    mini: 'Sit on the floor and mimic their play style or parallel play without inserting any neurotypical rules.',
    macro: 'Create a 45-minute "Yes Zone." Whatever safe, repetitive, or intense hyperfixation activity they want to do, you just watch or quietly support.',
    why: 'Constantly correcting safe autism behaviors creates an environment of rejection. True safety lives in shared, unconditional presence.'
  },
  {
    id: 'conn-2',
    category: 'connection',
    title: 'Permission to stop replaying the blowout',
    permission: 'You lost your temper, raised your voice, or handled an escalation poorly. You are human. Replaying the guilt in your head won\'t fix it.',
    micro: 'Place your hand over your solar plexus and say: "That moment is over."',
    mini: 'Re-enter their space with a completely soft posture and a simple, zero-shame offering like a favorite snack.',
    macro: 'Model an emotional reset. Say: "My brain was overwhelmed earlier. I’m calm now. I love you." Then drop it forever.',
    why: 'Rupture is inevitable in high-stress homes. Neurodivergent kids don\'t need perfect parents; they need parents who are safe enough to repair.'
  },
  {
    id: 'conn-3',
    category: 'connection',
    title: 'Permission to just be an anchor in the room',
    permission: 'You don\'t always have to actively engage, perform, or run structured activities. Simply occupying the same room with a peaceful body is parenting.',
    micro: 'Sit on the couch, lean your head back, and just exist in their vicinity.',
    mini: 'Spend ten minutes sitting quietly near their play space browsing something comforting, providing a calm energetic anchor.',
    macro: 'Remove all active agendas from your afternoon. Sit nearby, read a book or relax, and let them access your calm presence whenever they choose.',
    why: 'An over-anxious, over-interactive caregiver can accidentally overwhelm an easily overstimulated child. Sometimes quiet presence is the deepest connection.'
  },
  {
    id: 'conn-4',
    category: 'connection',
    title: 'Permission to celebrate a microscopic win',
    permission: 'If your metric for a good day requires your child to act like a neurotypical peer, you will always feel defeated. Change the scale entirely to match *their* world.',
    micro: 'Recall one split second today where they made direct eye contact or tolerated a sudden change.',
    mini: 'Write down one microscopic milestone that only an autism parent would understand or appreciate.',
    macro: 'End your night by looking exclusively at what your child managed to tolerate, communicate, or survive today despite their complex wiring.',
    why: 'Standard developmental timelines are irrelevant here. Micro-progress in a neurodivergent world is equivalent to climbing a mountain.'
  },
  {
    id: 'conn-5',
    category: 'connection',
    title: 'Permission to match their physical level',
    permission: 'You don’t have to look down at them from an adult height to connect. Getting flat on their level can change the whole dynamic.',
    micro: 'Drop your weight down to a deep squat or kneel right now.',
    mini: 'Lie down flat on your back on the rug while they are playing nearby, without asking for anything.',
    macro: 'Spend an evening sequence down on their physical baseline—couch cushions, floor play, low-demand connection.',
    why: 'Towering over an easily overwhelmed nervous system can unconsciously communicate a pressure demand.'
  },
  {
    id: 'conn-6',
    category: 'connection',
    title: 'Permission to validate the feeling behind the scream',
    permission: 'Even if the outburst is over something small like a broken cracker, the distress in their body is completely real. Address the fear, not the cracker.',
    micro: 'Soften your eyes and speak inside a lower octave.',
    mini: 'Say: "I see you are upset. That was surprising," and offer a steady, quiet hand or presence.',
    macro: 'Skip the logical explanation about why the cracker is fine and build a recovery sequence around comfort and safety.',
    why: 'Logic fails during fight-or-flight scenarios. Emotional validation restores connection fast.'
  },
  {
    id: 'conn-7',
    category: 'connection',
    title: 'Permission to use touchless reassurance',
    permission: 'If your child shrinks back from physical touch when they are overwhelmed, you can connect deeply through space instead.',
    micro: 'Pull your hands back slowly into a relaxed, open posture.',
    mini: 'Sit two feet further away but keep your body angled warmly toward them.',
    macro: 'Create an unpressured containment bubble: stay in their room, stay quiet, and let your calm breathing serve as their anchor.',
    why: 'Respecting protective physical boundaries builds a deep sense of relational trust.'
  },
  {
    id: 'joy-1',
    category: 'joy',
    title: 'Permission to enjoy them exactly as they are',
    permission: 'You don\'t need to fix, optimize, or teach them right now. Tonight, you have permission to step out of the "advocate" role and just enjoy your unique kid.',
    micro: 'Look at your child and find one detail about their facial expression or posture that you love.',
    mini: 'Spend 5 minutes watching them engage with the world completely unbothered by neurotypical social rules.',
    macro: 'Drop the bedtime rules for an extra 15 minutes just to cuddle, giggle, or sit together in their comfort zone with zero agenda.',
    why: 'Your child doesn\'t need to be cured or corrected to be a source of profound joy. Radical acceptance is a beautiful place to rest.'
  },
  {
    id: 'joy-2',
    category: 'joy',
    title: 'Permission to laugh at the weird stuff',
    permission: 'The echolalia scripting, the absurdly specific random facts, the intense dinosaur obsession, the same exact song played 400 times in a row—sometimes it is okay to just laugh and enjoy how magnificently unique they are.',
    micro: 'Smile or laugh along with a quirky habit instead of trying to quiet it down.',
    mini: 'Let them perform their current favorite script or repetitive joke for you with your full, delighted attention.',
    macro: 'Leap headfirst into the weirdness: join the script, sing the repetitive lyric back to them, and share an unfiltered moment of family silliness.',
    why: 'Humor and delight are the ultimate antidotes to chronic stress. It\'s not disrespectful to find joy in the eccentricities of autism—it\'s celebrating them.'
  },
  {
    id: 'joy-3',
    category: 'joy',
    title: 'Permission to notice what went right',
    permission: 'Forget progress reports, therapy tracking sheets, and behavioral goals. What is one specific, beautiful thing that simply made you smile today?',
    micro: 'Close your eyes and replay the exact moment they laughed or looked content today.',
    mini: 'Tell your partner, a friend, or log in your journal one purely happy moment from today, completely detached from any metrics.',
    macro: 'Sit down and intentionally list three things about your child’s personality that bring raw, uncomplicated joy to your household.',
    why: 'When you look at your child solely through the lens of diagnostic tracking, you miss the vibrant, brilliant individual shining underneath.'
  },
  {
    id: 'joy-4',
    category: 'joy',
    title: 'Permission to follow the fun',
    permission: 'If your child wants to spend 30 straight minutes talking about train schedules, species of bugs, complex highway maps, or vacuum cleaner mechanics, you are allowed to completely abandon your scheduled plan and enjoy the ride.',
    micro: 'Ask them one open-ended question about their hyperfixation and watch their face light up.',
    mini: 'Sit down and let them give you a mini-lecture on their favorite topic without trying to steer the conversation elsewhere.',
    macro: 'Spend a block of time completely immersed in their special interest. Trace the maps, look up the vacuum manuals, and share their infectious enthusiasm.',
    why: 'An autistic child\'s passion is a window into their heart. Following their fun builds an incredible bridge of mutual joy and validation.'
  },
  {
    id: 'joy-5',
    category: 'joy',
    title: 'Permission to admire their focus',
    permission: 'The way an autistic mind locks onto a task with absolute, unyielding focus is a beautiful superpower. You are allowed to be amazed by it.',
    micro: 'Watch their fingers line up objects or handle textures with deep presence.',
    mini: 'Spend three quiet minutes purely appreciating the intense concentration they bring to their favorite item.',
    macro: 'Document or sit quietly alongside their creation process, honoring the profound internal world they are building.',
    why: 'Delighting in their natural processing style strengthens your appreciation for how their brilliant mind operates.'
  },

  // ------------------------------------------
  // PART 2: SURVIVAL, CONNECTION & JOY
  // ------------------------------------------
  {
    id: 'surv-19',
    category: 'survival',
    title: 'Permission to leave the grocery cart behind',
    permission: 'If your child is hitting a massive sensory limit right in the middle of a grocery trip, you don\'t have to push through to the register. Walking out is a victory.',
    micro: 'Take your hand off the shopping cart handle and drop your shoulders.',
    mini: 'Quietly inform an employee: "I have to step out with my child," and walk to the exit.',
    macro: 'Abandon the errands entirely and make the ride home a zero-demand, soft-audio environment.',
    why: 'Food can be ordered online later. Protecting an already overloaded nervous system right now is your only priority.'
  },
  {
    id: 'surv-20',
    category: 'survival',
    title: 'Permission to use paper towels instead of bath towels',
    permission: 'If laundry day is behind and the thought of folding or washing towels makes you want to cry, or if your child has a sensory meltdown about the feel of a specific damp bath towel, use a shortcut.',
    micro: 'Grab a roll of paper towels without an ounce of self-criticism.',
    mini: 'Use disposable towels or paper alternatives to pat faces, hands, or wet spots clean.',
    macro: 'Simplify the whole family cleanup routine today with low-friction, single-use, safe hygiene choices.',
    why: 'Survival means preserving your remaining cognitive energy. Sometimes paper products are your best ally.'
  },
  {
    id: 'surv-21',
    category: 'survival',
    title: 'Permission to ignore non-safety behaviors',
    permission: 'If they are rolling on the floor, flipping the light switch repeatedly, or clicking their tongue, you do not have to redirect them if no one is getting hurt.',
    micro: 'Look at the repetitive behavior and consciously choose to let it go.',
    mini: 'Walk out of their line of sight for 5 minutes if the repetition is starting to overstimulate you.',
    macro: 'Turn a blind eye to all non-harmful, unconventional behaviors for the rest of the day to rest your voice.',
    why: 'Picking your battles preserves your sanity for when a genuine safety issue arises.'
  },
  {
    id: 'surv-22',
    category: 'survival',
    title: 'Permission to dress down for appointments',
    permission: 'You don\'t have to present a picture-perfect, crisp corporate version of yourself to your child’s developmental pediatrician, speech therapist, or school team.',
    micro: 'Put on your most comfortable sweatshirt without overthinking it.',
    mini: 'Choose outfits based purely on speed and ease rather than what external professionals expect.',
    macro: 'Attend today\'s meetings or sessions exactly as you are, letting your energy focus entirely on advocacy rather than vanity.',
    why: 'The professionals care about your insight and data, not whether you have an ironed collar.'
  },
  {
    id: 'surv-23',
    category: 'survival',
    title: 'Permission to pause the tooth-brushing standoff',
    permission: 'If the texture of the bristles or flavor of the paste triggers an intense, tear-filled sensory flight response tonight, you can skip it once.',
    micro: 'Put the toothbrush back in the holder and take a deep breath.',
    mini: 'Offer a quick water rinse, a soft silicone finger brush, or an oral wipe instead.',
    macro: 'End the oral care routine instantly if it risks triggering a major bedtime crisis, and revisit it tomorrow morning.',
    why: 'One missed brushing will not destroy dental health, but a high-stress battle will completely derail sleep schedules.'
  },
  {
    id: 'surv-24',
    category: 'survival',
    title: 'Permission to hide in plain sight',
    permission: 'If your child is safely strapped into their highchair or deep in a comforting sensory video loop, you are allowed to sit on the floor nearby and space out.',
    micro: 'Unclench your jaw and let your eyes go out of focus for a moment.',
    mini: 'Set your phone down, stare at the wall, and give your brain 5 minutes of total narrative emptiness.',
    macro: 'Sit in the safe room without interacting, offering only your passive presence while you internally recharge your battery.',
    why: 'Constant, active mental engagement is unsustainable. Safe spacing out is a form of cognitive recovery.'
  },
  {
    id: 'surv-25',
    category: 'survival',
    title: 'Permission to keep the curtains closed',
    permission: 'If the bright outdoor glare or the visual stimulation of people passing by the windows is amping up the house\'s stress, close it off.',
    micro: 'Pull down the nearest blind right now.',
    mini: 'Dim the visual perimeter of your main living space to block out unpredictable outdoor stimuli.',
    macro: 'Make today an indoor sanctuary day with low ambient light, keeping the outside world at a comfortable distance.',
    why: 'Controlling your visual boundaries can act like an immediate safety valve for an easily overstimulated home.'
  },
  {
    id: 'surv-26',
    category: 'survival',
    title: 'Permission to delay answering the school form',
    permission: 'The IEP packet, the therapy authorization paperwork, or the permission slip can sit on the counter for another 24 hours. Your brain is full.',
    micro: 'Slide the document stack out of direct line of sight.',
    mini: 'Tell yourself: "I will sign this tomorrow morning when I have a clear mind."',
    macro: 'Set a boundary to block out all administrative parenting work for the entire evening to prevent insomnia loops.',
    why: 'Administrative fatigue makes minor parenting decisions feel completely overwhelming. Rest first, paperwork second.'
  },
  {
    id: 'surv-27',
    category: 'survival',
    title: 'Permission to order the exact same comfort meal for yourself',
    permission: 'You don\'t have to cook a complex, separate, healthy meal for yourself just because your child is eating a simple safe food. Eat for survival comfort too.',
    micro: 'Open your food delivery app without any internal judgment.',
    mini: 'Order your favorite reliable comfort meal and let the kitchen stay completely quiet tonight.',
    macro: 'Simplify your own nutrition rules for the next 48 hours to match the low-demand energy of the household.',
    why: 'Caregiver burnout is accelerated when you attempt to maintain elite adult standards in the middle of a crisis.'
  },
  {
    id: 'surv-28',
    category: 'survival',
    title: 'Permission to stay in the car for 5 extra minutes',
    permission: 'When you arrive home and your child is calm or sleeping in the backseat, you are allowed to park and just sit there in the quiet stillness.',
    micro: 'Keep the engine off, lean your head back, and close your eyes.',
    mini: 'Take five full minutes of undisturbed silence before opening the doors to head inside.',
    macro: 'Use the transition window as a complete sanctuary block to lower your internal adrenaline levels before starting the next routine.',
    why: 'A quiet, stationary vehicle is one of the few places a caregiver can access absolute predictability.'
  },
  {
    id: 'surv-29',
    category: 'survival',
    title: 'Permission to utilize a safe containment space',
    permission: 'Using a playpen, a secured sensory bedroom, or a gated safe zone so you can take a necessary phone call or run to the bathroom is responsible caregiving.',
    micro: 'Gently place them in their safe space without feeling like you are putting them away.',
    mini: 'Secure the door or gate, ensure they have a safe item, and step away for 10 minutes.',
    macro: 'Designate a reliable daily window where they play in their fully secure, baby-proofed sanctuary so you can step down from constant vigilance.',
    why: 'Hyper-vigilance melts your resilience. Trusting a physically secure environment is a gift to your nervous system.'
  },
  {
    id: 'surv-30',
    category: 'survival',
    title: 'Permission to skip bath time entirely',
    permission: 'If your child hasn\'t been playing in actual mud, a skipped bath tonight will not harm them. If water transitions are a flashpoint, let it go.',
    micro: 'Consciously tell yourself: "They are clean enough for tonight."',
    mini: 'Wipe down faces and sticky hands with a simple baby wipe and call it a day.',
    macro: 'Cross the entire bathing routine off your evening list to secure a direct, low-demand path to bedtime.',
    why: 'Bathing takes high physical and sensory energy from both of you. Conserve that energy when the house battery is in the red.'
  },
  {
    id: 'conn-8',
    category: 'connection',
    title: 'Permission to join their parallel world',
    permission: 'You don\'t have to force your child to play "house" or "cars" with you standardly. Sitting right next to them and doing exactly what they are doing builds a powerful bridge.',
    micro: 'Sit on the floor within arms reach without speaking a word.',
    mini: 'Grab a similar object and mimic their lining, sorting, or spinning routine with deep respect.',
    macro: 'Spend a 30-minute block completely immersed in parallel play—no teaching, no directing, just quiet companionable presence.',
    why: 'Meeting your child exactly inside their comfort zone communicates absolute safety and relational acceptance.'
  },
  {
    id: 'conn-9',
    category: 'connection',
    title: 'Permission to use touchless reassurance',
    permission: 'If your child pulls away from physical hugs when their system is overloading, you can connect deeply through intentional space instead.',
    micro: 'Pull your hands back into an open, relaxed posture.',
    mini: 'Take a step back to widen their physical perimeter, but stay firmly anchored in the room.',
    macro: 'Create a quiet, touchless container: sit near the doorway, keep your body soft, and let your steady breathing provide the anchor.',
    why: 'Respecting protective sensory boundaries builds an incredible layer of long-term relational trust.'
  },
  {
    id: 'conn-10',
    category: 'connection',
    title: 'Permission to accept their unique affection',
    permission: 'An autistic child\'s hug might look like a firm headbutt, deep pressure leaning, or a light tap and run. Honor their custom love language.',
    micro: 'Lean your weight into their pressure without trying to force a traditional embrace.',
    mini: 'Receive their unique physical input with a soft smile and an immediate, low-demand: "I love you too."',
    macro: 'Redefine affection in your household to celebrate their sensory ways of connecting with your body.',
    why: 'Forcing a neurodivergent child to perform neurotypical displays of love can turn affection into a stressful demand.'
  },
  {
    id: 'conn-11',
    category: 'connection',
    title: 'Permission to validate the feeling behind the scream',
    permission: 'Even if the meltdown is over something tiny like a broken cracker or an unexpected turning point, the panic in their body is real. Address the fear, skip the lecture.',
    micro: 'Soften your posture and speak an octave lower than normal.',
    mini: 'Say: "I see you are upset. That was surprising," and offer a steady, calm presence.',
    macro: 'Skip the logical explanation about why the cracker is fine and guide them directly into a soothing recovery sequence.',
    why: 'Logic is completely inaccessible during fight-or-flight scenarios. Validation restores emotional safety fast.'
  },
  {
    id: 'conn-12',
    category: 'connection',
    title: 'Permission to repair instead of replay',
    permission: 'If you lost your cool or raised your voice during a difficult transition today, don\'t stay stuck in the guilt loop. You are human. Focus on the reset.',
    micro: 'Put your hand over your chest and state internally: "That hard moment is over."',
    mini: 'Re-enter their physical space with a soft face and a small, zero-pressure offering like a safe snack.',
    macro: 'Model a clean, loving emotional reset. Say: "My system was overwhelmed earlier. I am calm now. I love you." Then move forward.',
    why: 'Rupture is normal in high-stress homes; what matters is showing your child that relationships can always be safely repaired.'
  },
  {
    id: 'conn-13',
    category: 'connection',
    title: 'Permission to communicate using their favorite script',
    permission: 'Using lines from their favorite movie, show, or audio clip to talk to them isn\'t a cop-out; it\'s speaking their natural dialect.',
    micro: 'Recite a familiar line from their hyperfixation media when you see them looking anxious.',
    mini: 'Use a shared media script to ease a tricky transition or handle an entry routine today.',
    macro: 'Engage in an entire playful conversation using only their preferred verbal scripts, building a direct loop of shared safety.',
    why: 'Echolalia is functional communication. Stepping into their language pattern signals that you see and hear them clearly.'
  },
  {
    id: 'conn-14',
    category: 'connection',
    title: 'Permission to hold space without solving it',
    permission: 'When their nervous system is processing a change, you don\'t always have to scramble for a solution, tool, or redirect. Sitting with them in the storm is enough.',
    micro: 'Sit flat on the floor, open your arms slightly, and stop looking for a tool.',
    mini: 'Keep your body quiet and present while they let out the big feelings, offering an unmovable anchor.',
    macro: 'Allow a safe, non-injurious meltdown process to run its course naturally without intercepting or fixing it, remaining a peaceful guardian nearby.',
    why: 'Slowing down to hold steady space tells your child that their big, complex emotions are not too scary for you to handle.'
  },
  {
    id: 'joy-6',
    category: 'joy',
    title: 'Permission to follow the fun',
    permission: 'If your child wants to spend 30 uninterrupted minutes tracking train timetables, sorting colored blocks, or explaining vacuum mechanics, abandon your timeline and jump in.',
    micro: 'Ask one curious question about their hyperfixation and watch them spark.',
    mini: 'Sit down and listen to a mini-lecture on their preferred topic with full, genuinely delighted attention.',
    macro: 'Spend an hour fully immersed in their special interest, validating that their passions are deeply interesting to you.',
    why: 'A neurodivergent child\'s passion is a direct window into their heart. Shared interest builds an immediate bridge of joy.'
  },
  {
    id: 'joy-7',
    category: 'joy',
    title: 'Permission to admire their brilliant focus',
    permission: 'The way a neurodivergent mind can lock onto a task with absolute, unmatched concentration is a gorgeous thing to watch. You are allowed to be completely amazed.',
    micro: 'Watch their fingers organize items or explore textures with deep, calm presence.',
    mini: 'Spend three quiet minutes purely appreciating the focus they bring to their favorite hobby or toy arrangement.',
    macro: 'Quietly document or observe their building process today, celebrating the deep internal order they are curating.',
    why: 'Delighting in their natural processing style changes your worldview, strengthening your appreciation for how their brilliant mind works.'
  },
  {
    id: 'joy-8',
    category: 'joy',
    title: 'Permission to celebrate their sensory delight',
    permission: 'When they splash water wildly, watch spinning wheels with sheer euphoria, or feel a texture with intense happiness, let yourself absorb that pure emotion.',
    micro: 'Smile actively alongside their flapping or vocal stims of genuine happiness.',
    mini: 'Provide extra access to whatever safe texture or visual item is currently lighting up their system with joy.',
    macro: 'Create an environment dedicated purely to sensory joy today, letting yourself experience their raw, unedited happiness.',
    why: 'Neurodivergent sensory processing can bring intense dysregulation, but it can also unlock levels of pure, uncomplicated joy that are infectious.'
  },
  {
    id: 'joy-9',
    category: 'joy',
    title: 'Permission to delight in their honesty',
    permission: 'Autistic children have zero social mask; they say exactly what they mean and feel. You are allowed to find their absolute clarity refreshing and wonderful.',
    micro: 'Savor a moment of direct, literal communication without trying to correct their manners.',
    mini: 'Enjoy the humor in an unedited, honest statement they made today, appreciating their authentic look at the world.',
    macro: 'Celebrate a day of zero hidden agendas, double meanings, or social games in your household, valuing their clear transparency.',
    why: 'In a world full of social posturing, the absolute clarity and truth of an autistic child is a beautiful, trustworthy space to live.'
  },
  {
    id: 'joy-10',
    category: 'joy',
    title: 'Permission to pause the tracking for a laugh',
    permission: 'You don\'t have to be clinical 24/7. When your child performs a hilariously elaborate script or creates a bizarre line of shoes across the kitchen, it\'s okay to just laugh.',
    micro: 'Let out an unedited giggle at a quirky moment instead of logging it as data.',
    mini: 'Share a funny, uniquely endearing moment with a safe friend who gets it, completely skipping any clinical analysis.',
    macro: 'Spend an evening enjoying the quirky rhythm of your household, prioritizing shared laughter over therapeutic metrics.',
    why: 'Humor is a profound nervous system regulator. Embracing the unique comedy of your day preserves your family\'s joy.'
  },

  // ------------------------------------------
  // PREMIUM CARDS (151–180 REMIXED)
  // ------------------------------------------
  {
    id: 'surv-91',
    category: 'survival',
    title: 'Permission to stop researching clinical strategies tonight',
    permission: 'Your late-night search engine history does not dictate your performance as an advocate. You are allowed to log off before you hit information exhaustion.',
    micro: 'Close the open browser tabs detailing diagnostics or alternative setups.',
    mini: 'Put your primary display face down and slide it entirely out of arm\'s reach.',
    macro: 'Enforce an absolute research freeze after dark tonight, preserving your evening hours strictly for sleep.',
    why: 'Anxiety often masquerades as productive late-night data mining. Chronic cognitive overload drains your capacity to handle tomorrow.'
  },
  {
    id: 'surv-92',
    category: 'survival',
    title: 'Permission to access backup family coverage',
    permission: 'Attempting to run an intense, 24/7 neurodivergent home entirely in isolation is an operational hazard. Reaching out for backup support is smart parenting.',
    micro: 'Name one trusted clinical professional, partner, or friend who knows your reality.',
    mini: 'Send a zero-explanation request: "Today has been a high-demand day. Are you free to cover me later?"',
    macro: 'Carve out an uncompromised 2-hour window where somebody else holds down physical safety boundaries while you step away.',
    why: 'Resilience is built on systemic community layers. Caregivers who delegate routine logistics safely prevent total household crashes.'
  },
  {
    id: 'surv-93',
    category: 'survival',
    title: 'Permission to actively pick the path of least resistance',
    permission: 'The most exhausting, high-friction choice is not automatically the superior parenting method. Safe structural shortcuts are completely valid choices.',
    micro: 'Identify the upcoming routine that is making your stomach drop right now.',
    mini: 'Strip away 50% of the procedural steps—use frozen shortcuts, skip clothing swaps, or ignore non-essential rules.',
    macro: 'Design the entire afternoon around zero friction lines, prioritizing absolute comfort loops over perfection.',
    why: 'Conserving your physical and mental stamina across minor tasks keeps your baseline stable for genuine safety requirements.'
  },
  {
    id: 'surv-94',
    category: 'survival',
    title: 'Permission to convert today into a maintenance window',
    permission: 'If your family baseline was destroyed by poor sleep or back-to-back transitions, cancel your milestones. Surviving safely is an achievement.',
    micro: 'Cross out the non-safety objective on your daily checklist.',
    mini: 'Postpone an administrative or non-urgent deadline without overthinking the adjustment.',
    macro: 'Measure today\'s success purely by the collective stillness of the home rather than checkboxes or charts.',
    why: 'Low-capacity days demand radical operational decompression. Attempting to match high-energy timelines is a recipe for a crash.'
  },
  {
    id: 'surv-95',
    category: 'survival',
    title: 'Permission to leave the environmental reset undone',
    permission: 'The sensory bin spill, the unwashed plates, and the scattered living room cushions do not need to be restored before your head hits the pillow.',
    micro: 'Look at the main household clutter zone, say "not tonight," and walk away.',
    mini: 'Clear a 2-foot safety channel so nobody trips during midnight check-ins, leaving the rest untouched.',
    macro: 'Go to sleep inside a messy room without internal apologizing, choosing restorative rest over domestic upkeep.',
    why: 'Spotless kitchen counters have zero correlation with avoiding a midnight sensory meltdown. Your sleep capacity does.'
  },
  {
    id: 'surv-96',
    category: 'survival',
    title: 'Permission to rest inside a high-friction day',
    permission: 'You do not have to earn your right to sit down by completing every chore first. Rest is a mandatory maintenance requirement.',
    micro: 'Drop your entire weight flat back into your chair for 60 seconds.',
    mini: 'Sit down with a warm drink and refuse to process the upcoming schedule for five full minutes.',
    macro: 'Schedule an explicit 20-minute operational pause where chores are abandoned, letting your internal systems down-regulate.',
    why: 'Waiting for a neurodivergent household checklist to hit absolute zero means you will literally never access rest again.'
  },
  {
    id: 'surv-97',
    category: 'survival',
    title: 'Permission to utilize rapid emergency nutrition options',
    permission: 'You don\'t have to orchestrate a complex, organic, separate adult meal while managing custom safe foods for your child. Eat for basic caloric fuel.',
    micro: 'Unclench your stomach muscles and drop any nutritional guilt for the afternoon.',
    mini: 'Rely on frozen shortcuts, canned options, or easy takeout to keep your body fueled with near-zero prep time.',
    macro: 'Declare a complete vacation from complex cooking lines this weekend, keeping your kitchen sink entirely clear.',
    why: 'Caregiver physical depletion accelerates raw behavioral burnout. A fed anchor keeps the household secure.'
  },
  {
    id: 'surv-98',
    category: 'survival',
    title: 'Permission to issue a firm boundary to outsiders',
    permission: 'You do not have to validate, adapt to, or say yes to demanding requests from friends or relatives who do not understand your child’s processing constraints.',
    micro: 'Pause your fingers over the keyboard before typing an apologetic response.',
    mini: 'Draft a direct script: "That layout does not match our current schedule requirements, but I hope you have a blast!"',
    macro: 'Block out external social demands this weekend to establish an absolute sensory sanctuary for your immediate household.',
    why: 'Protecting your internal family energy reserves from social compliance pressure is an act of high-utility caregiving.'
  },
  {
    id: 'surv-99',
    category: 'survival',
    title: 'Permission to run a complete zero-agenda day',
    permission: 'Your weekend does not require packed social enrichment activities, community exposure outings, or structured routines to be successful.',
    micro: 'Look at your calendar layout and clear out the upcoming time block.',
    mini: 'Create an extra two-hour pocket of unstructured downtime right in the middle of the afternoon transition.',
    macro: 'Allow the remainder of the day to float entirely inside a low-demand rhythm, letting everyone\'s systems find equilibrium.',
    why: 'Slowing the collective timeline down reduces hidden transition anxieties, giving fragile nervous systems room to decompress.'
  },
  {
    id: 'surv-100',
    category: 'survival',
    title: 'Permission to drop the self-optimization mask tonight',
    permission: 'You are allowed to just exist alongside your life without trying to fix, correct, smooth out, or elevate any part of your family infrastructure.',
    micro: 'Take one long, audible exhale through your teeth right now.',
    mini: 'Pause the professional advocate mindset for the remainder of the evening.',
    macro: 'Spend tonight simply getting through safely and gently, honoring the raw humanity of survival mode.',
    why: 'Unyielding performance pressure melts your long-term resilience. Give yourself full clearance to drop the clipboard.'
  },
  {
    id: 'conn-36',
    category: 'connection',
    title: 'Permission to build rapport without an instructional prompt',
    permission: 'Not every single play session or interaction needs a discrete trial, language milestone, or communication target attached to it.',
    micro: 'Watch their hands manipulate an item for 30 seconds without adding a comment.',
    mini: 'Sit quietly on the floor within arms reach, observing their world without forcing eye contact.',
    macro: 'Spend 20 unhurried minutes engaging in parallel play with zero clinical tracking or hidden behavioral objectives.',
    why: 'True relational safety thrives when a child experiences their parent as a comfortable companion rather than a constant examiner.'
  },
  {
    id: 'conn-37',
    category: 'connection',
    title: 'Permission to sit inside comfortable verbal silence',
    permission: 'You don\'t have to fill the environment with constant educational commentary, vocal praise, or paragraph-long explanations.',
    micro: 'Stop talking mid-sentence and let out a soft breath.',
    mini: 'Replace an extensive verbal instruction with a single, clear visual gesture or physical model.',
    macro: 'Conduct the entire next routine block using minimal language and maximum physical predictability, letting the room settle.',
    why: 'Auditory processing demands massive neurological energy during stress. Comfortable quiet lightens the sensory workload for everyone.'
  },
  {
    id: 'conn-38',
    category: 'connection',
    title: 'Permission to value the microscopic intent',
    permission: 'Progress in a neurodivergent ecosystem does not have to match standard peer metrics to be deeply significant and valuable.',
    micro: 'Recall a single split-second today where your child tolerated an unexpected change.',
    mini: 'Validate their micro-effort specifically: "I saw you try that transition. I know that was loud."',
    macro: 'Reflect exclusively on how much internal processing energy they brought to their day despite complex internal constraints.',
    why: 'Changing your scale to match their specific processing parameters changes your whole relationship, highlighting hidden wins.'
  },
  {
    id: 'conn-39',
    category: 'connection',
    title: 'Permission to share shared space touchlessly',
    permission: 'If physical hugs or direct contact triggers a tactile defense response during stress, respect that boundary. Proximity is connection.',
    micro: 'Relax your hands into an open, passive position by your side.',
    mini: 'Sit two feet back on the rug, maintaining a warm presence without pressing into their physical bubble.',
    macro: 'Anchor their room with your calm body: sit near the wall, read a book, and let your steady breathing provide reassurance.',
    why: 'Honoring protective physical boundaries signals to an anxious child that their personal autonomy is completely safe with you.'
  },
  {
    id: 'conn-40',
    category: 'connection',
    title: 'Permission to execute a clean relational restart',
    permission: 'A high-stress morning sequence or an explosive transition interaction does not doom the remainder of your afternoon block.',
    micro: 'Put your hand over your solar plexus and say: "That difficult block is finished."',
    mini: 'Re-enter their space with a soft face and a small, zero-shame offering like a favorite comfort item.',
    macro: 'Model a complete emotional reset without referencing the past conflict. Say: "My system was overloaded. I am calm now."',
    why: 'Neurodivergent households experience intense ruptures; what matters is demonstrating that relationships can always be safely repaired.'
  },
  {
    id: 'conn-41',
    category: 'connection',
    title: 'Permission to step directly into their hyperfixation track',
    permission: 'You do not have to steer their focus back to "functional" toys or mainstream games. Following their passion track is a direct route to their heart.',
    micro: 'Scan the room to observe what item or topic is currently anchoring their attention.',
    mini: 'Ask a single, open-ended question about their special interest area and watch their face ignite.',
    macro: 'Spend an hour fully immersed in their preferred world—trace maps, review train schedules, or line up objects alongside them with respect.',
    why: 'An autistic child’s passion is their primary tool for predictability and emotional regulation. Sharing it builds massive trust.'
  },
  {
    id: 'conn-42',
    category: 'connection',
    title: 'Permission to capture an unedited micro-moment',
    permission: 'Relational connection doesn\'t look like a staged holiday card. It lives inside ordinary, unstructured, and eccentric everyday routines.',
    micro: 'Look at the unusual way your child is organizing their items right now and smile.',
    mini: 'Spend three quiet minutes purely appreciating a quirky processing habit without trying to shape it.',
    macro: 'Document or memorize one tiny, unscripted pattern of family rhythm today that brings an uncomplicated sense of safety to the room.',
    why: 'Slowing down to witness your family\'s natural, organic baseline builds deep appreciation for your authentic lifestyle.'
  },
  {
    id: 'conn-43',
    category: 'connection',
    title: 'Permission to accept your authentic parental humanity',
    permission: 'Your child does not require a flawless, robotic clinical execution tool. They need an authentic, safe human anchor who handles mistakes gracefully.',
    micro: 'Drop one layer of self-criticism regarding how you handled a transition earlier.',
    mini: 'Forgive your system for reaching its limit today; high-cognitive-load parenting is hard work.',
    macro: 'Model radical self-compassion openly in your home, validating that imperfection is a natural part of a loving ecosystem.',
    why: 'When children witness their parents treating their own mistakes with kindness, they learn that it is safe to be imperfect themselves.'
  },
  {
    id: 'conn-44',
    category: 'connection',
    title: 'Permission to express safety using their custom dialect',
    permission: 'Utilizing echolalia lines, sound frequencies, or repetitive media loops to communicate affection is creative, premium parenting.',
    micro: 'Recite a familiar line from their hyperfixation media when you see them looking tense.',
    mini: 'Incorporate a favorite media script to ease a tricky transition or handle an entry routine with zero social pressure.',
    macro: 'Converse inside their preferred verbal patterns today, building an exclusive loop of shared family safety.',
    why: 'Echolalia is highly functional communication. Stepping directly into their language matrix tells your child that they are truly heard.'
  },
  {
    id: 'conn-45',
    category: 'connection',
    title: 'Permission to view them entirely outside the clinical framework',
    permission: 'Your child is a whole, vibrant, brilliant individual, not a collection of diagnostic codes, deficit charts, and therapy targets.',
    micro: 'Look past the clinical definitions and lock onto one detail of their personality you adore.',
    mini: 'Share an endearing, non-clinical story about your child\'s unique perspective with a trusted friend.',
    macro: 'Spend the entire evening celebrating their natural strengths and eccentricities, completely detached from professional data tracking.',
    why: 'When you separate a child from their tracking paperwork, you unlock space for raw, mutual delight and connection.'
  },
  {
    id: 'joy-26',
    category: 'joy',
    title: 'Permission to feel deep, private internal pride',
    permission: 'You are allowed to celebrate your incredible growth and adaptability as a parent, even if outsiders don\'t see the invisible heavy lifting.',
    micro: 'Recall one high-stress transition today that you anchored with a calm presence.',
    mini: 'Write a single sentence in your journal detailing an intuitive adjustment you made that prevented an escalation.',
    macro: 'Spend some quiet time tonight acknowledging the deep emotional endurance you bring to your family structure every single day.',
    why: 'Autism caregiving is invisible, complex labor. Intentionally validating your own expertise preserves your long-term joy.'
  },
  {
    id: 'joy-27',
    category: 'joy',
    title: 'Permission to celebrate the wonderful eccentricities of your home',
    permission: 'Small, quirky victories that only an autism family would understand are worthy of massive, joyful recognition.',
    micro: 'Smile at the unique, elaborate shoe line or object alignment across the floor.',
    mini: 'Text a safe peer or co-parent to celebrate a tiny win that would sound completely bizarre to a neurotypical family.',
    macro: 'Maintain a running mental list of the custom, hilarious, and brilliant routines that make your neurodivergent household completely special.',
    why: 'Reframing unconventional household moments as indicators of comfort and safety unlocks immediate daily joy.'
  },
  {
    id: 'joy-28',
    category: 'joy',
    title: 'Permission to anchor completely inside the present moment',
    permission: 'You do not have to spend your remaining evening bandwidth managing housing, adulthood adjustments, or long-term prognosis loops. Be here.',
    micro: 'Tell your mind: "We are off the hook for solving the future until tomorrow morning."',
    mini: 'Spend ten minutes fully experiencing an uncomplicated, quiet moment of contentment in the room.',
    macro: 'Enforce an absolute ban on long-term future projections tonight, allowing your system to rest in immediate predictability.',
    why: 'Anxiety tricks the brain into thinking future ruminating is productive. It isn\'t; it simply steals the joy available right now.'
  },
  {
    id: 'joy-29',
    category: 'joy',
    title: 'Permission to document the unpolished, raw family moments',
    permission: 'You do not need to wait for traditional milestone achievements or picture-perfect scenarios to capture happy family memories.',
    micro: 'Snap a candid photo of your child completely lost in their favorite sensory stim or play position.',
    mini: 'Save a quick audio recording of their favorite repetitive script or happy vocalization to revisit later.',
    macro: 'Build an internal memory bank dedicated strictly to unfiltered neurodivergent delight, entirely detached from clinical targets.',
    why: 'Preserving raw snapshots of raw family comfort builds an authentic historical record of unconditional acceptance.'
  },
  {
    id: 'joy-30',
    category: 'joy',
    title: 'Permission to smile at the slow, steady current of progress',
    permission: 'Developmental shifts in a neurodivergent world unfold in quiet, subtle patterns. You are allowed to step back and be amazed.',
    micro: 'Think back to where your family baseline stood six months ago during transitions.',
    mini: 'Identify one micro-adjustment your child has integrated that makes their daily routine slightly more comfortable.',
    macro: 'End your day by honoring the slow mountain climb your family is successfully executing together, resting in deep satisfaction.',
    why: 'When you track the long-term arc rather than day-to-day fluctuations, you witness the magnificent resilience of your child.'
  },
  {
    id: 'joy-31',
    category: 'joy',
    title: 'Permission to love the version of life you actually have',
    permission: 'This may not be the parenting life you pictured, but it can still hold beauty, humor, closeness, and moments that feel deeply meaningful.',
    micro: 'Name one small thing about your real life today that felt tender or sweet.',
    mini: 'Let yourself appreciate one peaceful moment without comparing it to the life you expected.',
    macro: 'Spend tonight honoring the family rhythm you are actually building, not the version you once thought you had to create.',
    why: 'Acceptance does not mean giving up. It means making room to notice the love that is already here.'
  }
];