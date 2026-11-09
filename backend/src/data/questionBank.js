/**
 * Dynamic curriculum question repository for NEET, JEE, and CBSE
 * Supports rich syllabus-aligned question pools, Fisher-Yates option shuffling,
 * difficulty progression (Easy -> Medium -> Hard), and user non-repetition filtering.
 */

// Fisher-Yates array shuffling
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Cleans any marker substrings like '(Correct)'
function cleanText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/\s*\(Correct\)\s*/gi, '').trim();
}

// Remove duplicate questions based on lowercase, trimmed question text
function removeDuplicateQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  const seen = new Set();

  return questions.filter((question) => {
    if (!question) return false;
    const raw = question.question || question.question_text || question.text || '';
    const key = String(raw).trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

// Randomly shuffles the 4 options of a question and updates correct_answer position
function randomizeQuestionOptions(question) {
  const cleanCorrect = cleanText(question.correct_answer);
  const cleanOptions = (question.options || []).map(cleanText);

  // Shuffle the options
  const shuffledOptions = shuffleArray(cleanOptions);

  // Ensure correct_answer exists in shuffled options
  let finalCorrect = cleanCorrect;
  if (!shuffledOptions.includes(finalCorrect)) {
    // If not found directly, find the best matching option or fall back
    const match = shuffledOptions.find(
      (opt) => opt.toLowerCase() === cleanCorrect.toLowerCase() ||
               opt.toLowerCase().includes(cleanCorrect.toLowerCase()) ||
               cleanCorrect.toLowerCase().includes(opt.toLowerCase())
    );
    finalCorrect = match || shuffledOptions[0];
  }

  return {
    ...question,
    options: shuffledOptions,
    correct_answer: finalCorrect,
    explanation: cleanText(question.explanation),
  };
}

// ==========================================
// CURATED CHAPTER QUESTION POOLS
// ==========================================

const BIOLOGY_GENETICS_QUESTIONS = [
  {
    text: 'Which term describes an alternative form of a gene located at a specific locus on homologous chromosomes?',
    options: [
      'Allele: An alternative form of a gene',
      'Genotype: The entire genetic makeup',
      'Phenotype: Observable physical manifestation',
      'Epistasis: Masking of gene effect',
    ],
    correct: 'Allele: An alternative form of a gene',
    explanation: 'Alleles are variant forms of the same gene residing at the same locus on homologous chromosomes.',
    difficulty: 'easy',
  },
  {
    text: 'In a dihybrid cross of heterozygous parents (AaBb x AaBb), what is the expected phenotypic ratio assuming independent assortment?',
    options: ['9 : 3 : 3 : 1', '1 : 2 : 1', '3 : 1', '12 : 3 : 1'],
    correct: '9 : 3 : 3 : 1',
    explanation: 'Mendel\'s law of independent assortment produces a 9:3:3:1 phenotypic ratio in standard dihybrid crosses.',
    difficulty: 'medium',
  },
  {
    text: 'Down syndrome in humans is caused by which of the following cytogenetic abnormalities?',
    options: [
      'Trisomy of chromosome 21',
      'Monosomy of X chromosome (XO)',
      'XXY sex chromosome constitution',
      'Deletion of short arm of chromosome 5',
    ],
    correct: 'Trisomy of chromosome 21',
    explanation: 'Down syndrome is caused by the presence of an extra copy of chromosome 21 (trisomy 21) due to nondisjunction.',
    difficulty: 'easy',
  },
  {
    text: 'Which enzyme is primarily responsible for synthesizing the leading and lagging DNA strands during eukaryotic replication?',
    options: [
      'DNA Polymerase Delta and Epsilon',
      'RNA Primase exclusively',
      'Topoisomerase I',
      'Reverse Transcriptase',
    ],
    correct: 'DNA Polymerase Delta and Epsilon',
    explanation: 'Eukaryotic DNA Polymerase epsilon synthesizes the leading strand, while delta synthesizes the lagging strand.',
    difficulty: 'medium',
  },
  {
    text: 'In T.H. Morgan\'s experiments on Drosophila melanogaster, the deviation from 9:3:3:1 in F2 generation of dihybrid crosses was due to:',
    options: [
      'Linkage between genes on the same chromosome',
      'Crossing over between non-homologous autosomes',
      'Epistatic suppression of maternal alleles',
      'Complete absence of meiotic prophase',
    ],
    correct: 'Linkage between genes on the same chromosome',
    explanation: 'Morgan demonstrated that physical association of genes on the same chromosome is termed linkage, causing parental phenotypes to exceed recombinants.',
    difficulty: 'hard',
  },
  {
    text: 'A cross between pure red-flowered and pure white-flowered snapdragon (Antirrhinum majus) produces pink progeny in F1. This is an example of:',
    options: [
      'Incomplete Dominance',
      'Codominance',
      'Multiple Allelism',
      'Pleiotropy',
    ],
    correct: 'Incomplete Dominance',
    explanation: 'In incomplete dominance, neither allele is completely dominant, yielding an intermediate pink heterozygous phenotype (Rr).',
    difficulty: 'easy',
  },
  {
    text: 'A classic test cross is used by geneticists to determine which of the following characteristics?',
    options: [
      'Genotype of an individual displaying a dominant phenotype',
      'Total chromosomal karyotype count of gametes',
      'Maternal cytoplasmic inheritance pattern',
      'Spontaneous mutation frequency of a dominant allele',
    ],
    correct: 'Genotype of an individual displaying a dominant phenotype',
    explanation: 'A test cross involves crossing an unknown dominant organism with a homozygous recessive parent to reveal if it is homozygous or heterozygous.',
    difficulty: 'medium',
  },
  {
    text: 'Sickle-cell anemia is caused by a point mutation leading to the substitution of which amino acid at position 6 of the beta-globin chain?',
    options: [
      'Glutamic acid replaced by Valine (GAG to GUG)',
      'Valine replaced by Glutamic acid (GUG to GAG)',
      'Lysine replaced by Arginine (AAG to AGG)',
      'Glycine replaced by Alanine (GGC to GCC)',
    ],
    correct: 'Glutamic acid replaced by Valine (GAG to GUG)',
    explanation: 'Sickle cell anemia results from a single base substitution changing the codon from GAG (Glutamic acid) to GUG (Valine) at position 6.',
    difficulty: 'medium',
  },
  {
    text: 'According to Chargaff\'s rules, if human double-stranded DNA contains 30% Adenine, what is the percentage of Cytosine?',
    options: ['20% Cytosine', '30% Cytosine', '40% Cytosine', '15% Cytosine'],
    correct: '20% Cytosine',
    explanation: 'In dsDNA, A = T = 30%, so A+T = 60%. Remaining G+C = 40%, hence C = 20% and G = 20%.',
    difficulty: 'medium',
  },
  {
    text: 'The Lac operon in E. coli is considered to be under negative regulation because the repressor protein:',
    options: [
      'Binds to the operator to block RNA polymerase transcription',
      'Binds directly to the promoter to activate transcription',
      'Inactivates the beta-galactosidase structural gene directly',
      'Degrades cyclic AMP when lactose is absent',
    ],
    correct: 'Binds to the operator to block RNA polymerase transcription',
    explanation: 'The Lac repressor binds to the operator region in the absence of allolactose, physically preventing RNA polymerase from transcribing the operon.',
    difficulty: 'hard',
  },
  {
    text: 'In human ABO blood grouping, which alleles exhibit codominance when present together?',
    options: [
      'I^A and I^B',
      'I^A and i',
      'I^B and i',
      'Only homozygous ii alleles',
    ],
    correct: 'I^A and I^B',
    explanation: 'Alleles I^A and I^B are codominant; when both are present (I^A I^B), both A and B sugar antigens are expressed on RBC membranes.',
    difficulty: 'easy',
  },
  {
    text: 'Turner syndrome in human females is characterized by which karyotype?',
    options: [
      '45, X0',
      '47, XXY',
      '47, XYY',
      '46, XX with 5p deletion',
    ],
    correct: '45, X0',
    explanation: 'Turner syndrome results from monosomy of the X chromosome, giving 45 chromosomes with an XO constitution.',
    difficulty: 'easy',
  },
  {
    text: 'What is the phenotypic sex determination mechanism found in birds?',
    options: [
      'ZW female and ZZ male',
      'XX female and XY male',
      'XX female and XO male',
      'Haplodiploidy',
    ],
    correct: 'ZW female and ZZ male',
    explanation: 'In birds, females are heterogametic (ZW) and males are homogametic (ZZ).',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following is a non-sense (stop) codon during mRNA translation?',
    options: [
      'UAA, UAG, and UGA',
      'AUG, UAA, and UGG',
      'UAC, UAU, and UAA',
      'GGA, GGU, and GGC',
    ],
    correct: 'UAA, UAG, and UGA',
    explanation: 'UAA (ochre), UAG (amber), and UGA (opal) are the three universal termination or stop codons in the genetic code.',
    difficulty: 'easy',
  },
  {
    text: 'Hershey and Chase demonstrated that DNA is the genetic material of bacteriophage T2 using radioactive isotopes of:',
    options: [
      'Phosphorus-32 for DNA and Sulfur-35 for protein',
      'Sulfur-35 for DNA and Phosphorus-32 for protein',
      'Nitrogen-15 for DNA and Carbon-14 for protein',
      'Hydrogen-3 for DNA and Oxygen-18 for protein',
    ],
    correct: 'Phosphorus-32 for DNA and Sulfur-35 for protein',
    explanation: 'DNA contains phosphorus but no sulfur (labeled with 32P), while proteins contain sulfur but no phosphorus (labeled with 35S).',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following RNA molecules acts as a catalyst (ribozyme) during peptide bond synthesis in bacteria?',
    options: [
      '23S rRNA',
      '16S rRNA',
      '5S rRNA',
      'hnRNA',
    ],
    correct: '23S rRNA',
    explanation: 'In prokaryotes, the 23S rRNA component of the 50S large ribosomal subunit acts as the peptidyl transferase ribozyme.',
    difficulty: 'hard',
  },
  {
    text: 'A pedigree chart shows that an affected father never passes the trait to his sons, but all his daughters are carriers or affected. The trait is most likely:',
    options: [
      'X-linked inheritance',
      'Y-linked inheritance',
      'Mitochondrial inheritance',
      'Autosomal recessive inheritance',
    ],
    correct: 'X-linked inheritance',
    explanation: 'Fathers pass their X chromosome exclusively to daughters and their Y chromosome to sons, which is the hallmark of X-linked transmission.',
    difficulty: 'hard',
  },
  {
    text: 'Meselson and Stahl demonstrated the semi-conservative replication of DNA using which organism and isotope?',
    options: [
      'Escherichia coli with 15N and 14N',
      'Drosophila melanogaster with 32P',
      'Streptococcus pneumoniae with 35S',
      'Pisum sativum with 14C',
    ],
    correct: 'Escherichia coli with 15N and 14N',
    explanation: 'Meselson and Stahl cultured E. coli in heavy 15N followed by 14N medium and analyzed DNA density using CsCl gradient centrifugation.',
    difficulty: 'medium',
  },
  {
    text: 'In split genes of eukaryotes, the coding sequences are called exons while intervening non-coding sequences removed by splicing are called:',
    options: [
      'Introns',
      'Cistrons',
      'Promoters',
      'Recons',
    ],
    correct: 'Introns',
    explanation: 'Introns are intervening non-coding segments spliced out from primary hnRNA transcripts by spliceosomes.',
    difficulty: 'easy',
  },
  {
    text: 'What is the probability of a heterozygous male (Aa) and a heterozygous female (Aa) having a homozygous recessive child (aa)?',
    options: ['25% (1 in 4)', '50% (1 in 2)', '75% (3 in 4)', '0%'],
    correct: '25% (1 in 4)',
    explanation: 'A Punnett square for Aa x Aa gives genotypes AA (25%), Aa (50%), and aa (25%).',
    difficulty: 'easy',
  },
];

const BIOLOGY_CELL_PHYSIOLOGY_QUESTIONS = [
  {
    text: 'During which stage of meiotic prophase I does crossing over (homologous genetic recombination) take place?',
    options: [
      'Pachytene',
      'Leptotene',
      'Zygotene',
      'Diakinesis',
    ],
    correct: 'Pachytene',
    explanation: 'Crossing over between non-sister chromatids of homologous chromosomes occurs during the pachytene stage via the recombinase enzyme complex.',
    difficulty: 'medium',
  },
  {
    text: 'The fluid mosaic model of the cell membrane proposed by Singer and Nicolson in 1972 describes the membrane as:',
    options: [
      'A phospholipid bilayer with quasi-fluid properties and embedded protein mosaic',
      'A static protein-lipid-protein sandwich model',
      'A rigid lipid monolayer surrounded by carbohydrate sheath',
      'A purely hydrophilic polysaccharide matrix',
    ],
    correct: 'A phospholipid bilayer with quasi-fluid properties and embedded protein mosaic',
    explanation: 'The fluid mosaic model represents the lipid bilayer as a viscous 2D liquid in which integral and peripheral proteins freely float.',
    difficulty: 'easy',
  },
  {
    text: 'Which organelle is considered the "protein factory" of the cell and is NOT enclosed by a membrane?',
    options: ['Ribosome', 'Lysosome', 'Peroxisome', 'Golgi apparatus'],
    correct: 'Ribosome',
    explanation: 'Ribosomes are non-membrane-bound ribonucleoprotein complexes responsible for protein translation in both prokaryotes and eukaryotes.',
    difficulty: 'easy',
  },
  {
    text: 'In human cardiac physiology, the pacemaker that initiates the rhythmic contraction of the heart is the:',
    options: [
      'Sinoatrial (SA) node',
      'Atrioventricular (AV) node',
      'Bundle of His',
      'Purkinje fibers',
    ],
    correct: 'Sinoatrial (SA) node',
    explanation: 'The SA node in the right atrium acts as the natural cardiac pacemaker by spontaneously generating action potentials at 70-75 bpm.',
    difficulty: 'easy',
  },
  {
    text: 'Which hormone triggers the ovulation of the secondary oocyte from the mature Graafian follicle in human females?',
    options: [
      'Luteinizing Hormone (LH surge)',
      'Progesterone',
      'Prolactin',
      'Human Chorionic Gonadotropin (hCG)',
    ],
    correct: 'Luteinizing Hormone (LH surge)',
    explanation: 'Rapid secretion of LH leading to maximum level around mid-cycle (LH surge) induces rupture of the Graafian follicle and releases the ovum.',
    difficulty: 'medium',
  },
  {
    text: 'What is the primary function of the Loop of Henle in the mammalian nephron?',
    options: [
      'Creation of a hyperosmolar medullary gradient for water conservation',
      'Filtration of plasma proteins from glomerulus',
      'Active secretion of uric acid crystals',
      'Storage of concentrated bladder contents',
    ],
    correct: 'Creation of a hyperosmolar medullary gradient for water conservation',
    explanation: 'The countercurrent multiplier system of the Loop of Henle establishes an osmotic gradient in the renal medulla, enabling urine concentration.',
    difficulty: 'hard',
  },
];

const PHYSICS_KINEMATICS_QUESTIONS = [
  {
    text: 'A particle moves in a straight line with constant acceleration a = 4 m/s^2. If it starts from rest, its displacement in the 3rd second is:',
    options: ['10 meters', '18 meters', '12 meters', '8 meters'],
    correct: '10 meters',
    explanation: 'Displacement in nth second: s_n = u + a/2(2n - 1). For u=0, a=4, n=3: s_3 = 0 + 2*(5) = 10 meters.',
    difficulty: 'medium',
  },
  {
    text: 'A ball is projected horizontally with velocity 20 m/s from a cliff of height 80 m (take g = 10 m/s^2). The horizontal range of the ball is:',
    options: ['80 meters', '60 meters', '100 meters', '40 meters'],
    correct: '80 meters',
    explanation: 'Time of fall t = sqrt(2h/g) = sqrt(160/10) = 4s. Horizontal range R = u * t = 20 * 4 = 80 meters.',
    difficulty: 'medium',
  },
  {
    text: 'The velocity-time graph of an object moving along a straight line is downward sloping with constant negative gradient. This indicates that the object is undergoing:',
    options: [
      'Constant negative acceleration (Uniform Retardation)',
      'Zero acceleration with non-zero jerk',
      'Uniform velocity in the negative direction',
      'Instantaneous reversal without speed change',
    ],
    correct: 'Constant negative acceleration (Uniform Retardation)',
    explanation: 'The slope of a v-t graph represents acceleration. A constant negative slope implies uniform negative acceleration (retardation).',
    difficulty: 'easy',
  },
  {
    text: 'A car accelerates uniformly from 10 m/s to 30 m/s while covering a distance of 200 m. What is the acceleration of the car?',
    options: ['2.0 m/s^2', '1.5 m/s^2', '3.0 m/s^2', '4.0 m/s^2'],
    correct: '2.0 m/s^2',
    explanation: 'Using v^2 = u^2 + 2as: 900 = 100 + 2*a*200 => 800 = 400a => a = 2.0 m/s^2.',
    difficulty: 'easy',
  },
  {
    text: 'A projectile launched from level ground at speed v0 achieves maximum horizontal range when the launch angle θ with the horizontal is:',
    options: ['45 degrees', '30 degrees', '60 degrees', '90 degrees'],
    correct: '45 degrees',
    explanation: 'Range R = (v0^2 * sin(2θ)) / g. Maximum occurs when sin(2θ) = 1, giving 2θ = 90°, so θ = 45°.',
    difficulty: 'easy',
  },
  {
    text: 'The position x(t) of a particle moving along the x-axis is given by x = 3t^2 - 12t + 5. At what time t is the velocity of the particle zero?',
    options: ['t = 2.0 seconds', 't = 4.0 seconds', 't = 1.0 second', 't = 3.0 seconds'],
    correct: 't = 2.0 seconds',
    explanation: 'Velocity v = dx/dt = 6t - 12. Setting v = 0 gives 6t = 12 => t = 2.0 seconds.',
    difficulty: 'medium',
  },
  {
    text: 'A stone is dropped from the top of a tower and reaches the ground in 4.0 seconds. Taking g = 9.8 m/s^2, the height of the tower is:',
    options: ['78.4 meters', '39.2 meters', '98.0 meters', '49.0 meters'],
    correct: '78.4 meters',
    explanation: 'Height h = ut + 0.5 * g * t^2. Since u = 0: h = 0.5 * 9.8 * 16 = 78.4 meters.',
    difficulty: 'easy',
  },
  {
    text: 'Which of the following physical quantities is a scalar quantity in classical kinematics?',
    options: ['Speed', 'Velocity', 'Acceleration', 'Displacement'],
    correct: 'Speed',
    explanation: 'Speed is defined solely by magnitude, making it a scalar quantity, whereas velocity, acceleration, and displacement are vectors.',
    difficulty: 'easy',
  },
  {
    text: 'If the displacement s of a particle is proportional to the square of time elapsed (s ∝ t^2), the body moves with:',
    options: [
      'Uniform constant acceleration',
      'Uniform velocity',
      'Variable non-zero jerk',
      'Linearly decreasing speed',
    ],
    correct: 'Uniform constant acceleration',
    explanation: 'If s = k*t^2, then velocity v = ds/dt = 2kt, and acceleration a = dv/dt = 2k = constant.',
    difficulty: 'medium',
  },
  {
    text: 'Two trains each of length 150 m are moving in opposite directions along parallel tracks with speeds 15 m/s and 20 m/s. The time of passing is:',
    options: ['8.57 seconds', '10.0 seconds', '12.5 seconds', '6.0 seconds'],
    correct: '8.57 seconds',
    explanation: 'Total distance to clear = 150 + 150 = 300 m. Relative speed = 15 + 20 = 35 m/s. Time = 300 / 35 ≈ 8.57 s.',
    difficulty: 'medium',
  },
  {
    text: 'A body is thrown vertically upward with speed u. The maximum height H reached by the body is given by:',
    options: ['u^2 / (2g)', '2u / g', 'u / (2g)', 'u^2 / g'],
    correct: 'u^2 / (2g)',
    explanation: 'At the maximum height, v = 0. From v^2 = u^2 - 2gH, we have 0 = u^2 - 2gH => H = u^2 / (2g).',
    difficulty: 'easy',
  },
  {
    text: 'For a uniform circular motion with radius r and constant speed v, the direction of centripetal acceleration is always:',
    options: [
      'Directed radially inward toward the center of the circle',
      'Tangent to the circular path in the direction of velocity',
      'Directed radially outward away from the circle',
      'Perpendicular to the plane of the circular orbit',
    ],
    correct: 'Directed radially inward toward the center of the circle',
    explanation: 'Centripetal acceleration has magnitude v^2/r and is always directed along the radius toward the center of curvature.',
    difficulty: 'easy',
  },
  {
    text: 'A river is flowing east at 3 km/h. A swimmer capable of swimming at 4 km/h in still water swims directly north. The swimmer\'s resultant velocity relative to the ground is:',
    options: ['5 km/h at 37° East of North', '7 km/h North', '1 km/h East', '5 km/h at 53° East of North'],
    correct: '5 km/h at 37° East of North',
    explanation: 'Resultant speed = sqrt(3^2 + 4^2) = 5 km/h. Angle θ with north = arctan(3/4) ≈ 37°.',
    difficulty: 'hard',
  },
];

const PHYSICS_LAWS_OF_MOTION_QUESTIONS = [
  {
    text: 'A block of mass 5 kg rests on a horizontal rough surface with coefficient of static friction μ_s = 0.4. What horizontal force is required to just initiate motion (take g = 10 m/s^2)?',
    options: ['20 N', '50 N', '10 N', '40 N'],
    correct: '20 N',
    explanation: 'Limiting friction f_max = μ_s * N = 0.4 * (5 * 10) = 20 N. Any force exceeding 20 N initiates motion.',
    difficulty: 'easy',
  },
  {
    text: 'According to Newton\'s third law of motion, action and reaction forces:',
    options: [
      'Act simultaneously on two different bodies',
      'Act on the same body and cancel each other to zero',
      'Act with unequal magnitudes during non-equilibrium',
      'Are separated by a finite propagation time delay',
    ],
    correct: 'Act simultaneously on two different bodies',
    explanation: 'Action and reaction forces always occur in pairs, are equal in magnitude, opposite in direction, and act on two distinct interacting bodies.',
    difficulty: 'easy',
  },
  {
    text: 'A rocket of initial mass M ejects gases at a constant relative speed u at a mass flow rate dm/dt. The instantaneous upward thrust on the rocket is:',
    options: [
      'u * (dm/dt)',
      'M * g - u * (dm/dt)',
      '0.5 * u * (dm/dt)^2',
      '(dm/dt) / u',
    ],
    correct: 'u * (dm/dt)',
    explanation: 'By conservation of momentum, the thrust force F_thrust = -u_rel * (dm/dt).',
    difficulty: 'medium',
  },
  {
    text: 'The work done by a conservative force along any closed path in a conservative field is always equal to:',
    options: ['Zero', 'Maximum potential energy', 'Total kinetic energy', 'Negative infinity'],
    correct: 'Zero',
    explanation: 'A conservative force field has path-independent work, meaning the line integral around any closed loop ∮ F · dr = 0.',
    difficulty: 'easy',
  },
];

const CHEMISTRY_QUESTIONS = [
  {
    text: 'For a chemical process occurring at constant temperature and pressure, the criterion for spontaneous feasibility is that:',
    options: [
      'ΔG < 0 (Gibbs free energy change is negative)',
      'ΔH > 0 (Enthalpy change is strictly positive)',
      'ΔS_system = 0 (System entropy remains constant)',
      'Equilibrium constant K_eq < 1',
    ],
    correct: 'ΔG < 0 (Gibbs free energy change is negative)',
    explanation: 'A process is thermodynamically spontaneous at constant T and P if and only if the Gibbs free energy change ΔG = ΔH - TΔS < 0.',
    difficulty: 'easy',
  },
  {
    text: 'According to Le Chatelier\'s principle, what happens to the exothermic equilibrium N2(g) + 3H2(g) ⇌ 2NH3(g) (ΔH < 0) when temperature is increased?',
    options: [
      'Equilibrium shifts backward to the left, favoring reactants',
      'Equilibrium shifts forward to the right, increasing ammonia yield',
      'Equilibrium constant K increases exponentially',
      'No shift occurs because pressure remains invariant',
    ],
    correct: 'Equilibrium shifts backward to the left, favoring reactants',
    explanation: 'For an exothermic reaction (ΔH < 0), heat acts as a product. Raising temperature shifts equilibrium toward the endothermic backward direction.',
    difficulty: 'medium',
  },
  {
    text: 'Which of the following molecular species possesses a linear geometry according to VSEPR theory?',
    options: ['BeCl2', 'H2O', 'SO2', 'NH3'],
    correct: 'BeCl2',
    explanation: 'BeCl2 has 2 bonding pairs and 0 lone pairs around Be (sp hybridization), yielding a linear geometry with a 180° bond angle.',
    difficulty: 'easy',
  },
  {
    text: 'In the coordination compound [Fe(CN)6]^(4-), the oxidation state and d-electron configuration of the central iron atom is:',
    options: ['Fe(II), t2g^6 eg^0 (Low spin diamagnetic)', 'Fe(III), t2g^5 eg^0', 'Fe(II), t2g^4 eg^2 (High spin)', 'Fe(0), 3d^8'],
    correct: 'Fe(II), t2g^6 eg^0 (Low spin diamagnetic)',
    explanation: 'CN- is a strong-field ligand causing maximum pairing. Fe^(2+) has 3d^6 electrons, completely filling the lower t2g orbitals.',
    difficulty: 'hard',
  },
  {
    text: 'Which mechanism is favored when a tertiary alkyl halide (such as tert-butyl bromide) undergoes nucleophilic substitution in a polar protic solvent?',
    options: [
      'SN1 mechanism via stable carbocation intermediate',
      'SN2 mechanism via concerted backside attack',
      'E1cB mechanism exclusively',
      'Radical addition mechanism',
    ],
    correct: 'SN1 mechanism via stable carbocation intermediate',
    explanation: 'Tertiary substrates form very stable 3° carbocations, and steric hindrance prevents backside attack, favoring the two-step SN1 pathway.',
    difficulty: 'medium',
  },
  {
    text: 'The pH of a 0.001 M hydrochloric acid (HCl) solution in water at 25°C is:',
    options: ['3.0', '1.0', '11.0', '7.0'],
    correct: '3.0',
    explanation: 'HCl is a strong acid completely dissociated: [H+] = 10^(-3) M. pH = -log[H+] = -log(10^-3) = 3.0.',
    difficulty: 'easy',
  },
];

const MATHEMATICS_QUESTIONS = [
  // Class 10th - Real Numbers, Polynomials & Quadratic Equations
  {
    text: 'According to the Fundamental Theorem of Arithmetic, every composite number can be expressed (factorized) as a product of primes, and this factorization is:',
    options: ['Unique, apart from the order in which the prime factors occur', 'Non-unique and dependent on algorithm', 'Applicable only to even integers', 'Finite only for square-free numbers'],
    correct: 'Unique, apart from the order in which the prime factors occur',
    explanation: 'The Fundamental Theorem of Arithmetic guarantees unique prime factorization for every integer n > 1 up to reordering.',
    difficulty: 'easy',
    subtopic: 'Fundamental Theorem of Arithmetic',
  },
  {
    text: 'If α and β are the roots of the quadratic equation 2x^2 - 7x + 3 = 0, what is the value of (α + β) and (α * β)?',
    options: ['α + β = 7/2, α * β = 3/2', 'α + β = -7/2, α * β = 3/2', 'α + β = 7/2, α * β = -3/2', 'α + β = 3/2, α * β = 7/2'],
    correct: 'α + β = 7/2, α * β = 3/2',
    explanation: 'For ax^2 + bx + c = 0, sum of roots = -b/a = -(-7)/2 = 7/2, product of roots = c/a = 3/2.',
    difficulty: 'easy',
    subtopic: 'Relationship Between Zeroes & Coefficients',
  },
  {
    text: 'What is the discriminant of the quadratic equation 3x^2 - 4√3x + 4 = 0, and what is the nature of its roots?',
    options: ['D = 0 (Two real and equal roots)', 'D > 0 (Two distinct real roots)', 'D < 0 (No real roots)', 'D = 16 (Irrational distinct roots)'],
    correct: 'D = 0 (Two real and equal roots)',
    explanation: 'D = b^2 - 4ac = (-4√3)^2 - 4(3)(4) = 48 - 48 = 0. Hence, roots are real and equal: x = 4√3 / 6 = 2√3 / 3 = 2 / √3.',
    difficulty: 'medium',
    subtopic: 'Nature of Roots & Discriminant (D = b^2 - 4ac)',
  },
  {
    text: 'Evaluate the trigonometric expression: (sin 30° + tan 45° - cosec 60°) / (sec 30° + cos 60° + cot 45°):',
    options: ['(43 - 24√3) / 11', '(3√3 - 4) / (3√3 + 4)', '(43 + 24√3) / 11', '1'],
    correct: '(43 - 24√3) / 11',
    explanation: 'Numerator = 1/2 + 1 - 2/√3 = (3√3 - 4)/(2√3). Denominator = 2/√3 + 1/2 + 1 = (3√3 + 4)/(2√3). Rationalizing gives (43 - 24√3)/11.',
    difficulty: 'tough',
    subtopic: 'Trigonometric Identities (sin^2 + cos^2 = 1)',
  },
  // Class 11th - Coordinate Geometry & Conic Sections
  {
    text: 'Find the equation of the line passing through (2, 3) and perpendicular to the line 3x + 4y - 7 = 0:',
    options: ['4x - 3y + 1 = 0', '4x + 3y - 17 = 0', '3x - 4y + 6 = 0', '4x - 3y - 1 = 0'],
    correct: '4x - 3y + 1 = 0',
    explanation: 'Slope of given line is -3/4. Perpendicular slope m = 4/3. Equation: y - 3 = (4/3)(x - 2) => 3y - 9 = 4x - 8 => 4x - 3y + 1 = 0.',
    difficulty: 'easy',
    subtopic: 'Slope-Intercept & Two-Point Equations of Lines',
  },
  {
    text: 'The eccentricity (e) of the hyperbola x^2 / 16 - y^2 / 9 = 1 is:',
    options: ['5 / 4', '4 / 5', '√7 / 4', '5 / 3'],
    correct: '5 / 4',
    explanation: 'For a hyperbola, b^2 = a^2(e^2 - 1). Here a^2 = 16, b^2 = 9. So 9 = 16(e^2 - 1) => e^2 = 25/16 => e = 5/4.',
    difficulty: 'medium',
    subtopic: 'Ellipse and Hyperbola Eccentricity & Asymptotes',
  },
  {
    text: 'How many 4-digit numbers can be formed using digits 1, 2, 3, 4, 5 without repetition such that the number is divisible by 4?',
    options: ['24 numbers', '12 numbers', '18 numbers', '36 numbers'],
    correct: '24 numbers',
    explanation: 'A number is divisible by 4 if its last two digits form a multiple of 4. Pairs: 12, 24, 32, 52 (4 possibilities). For each pair, remaining 2 digits can be chosen in 3 * 2 = 6 ways. Total = 4 * 6 = 24.',
    difficulty: 'tough',
    subtopic: 'Fundamental Counting Principle (nPr, nCr)',
  },
  // Class 12th - Calculus, Matrices & Vectors
  {
    text: 'What is the derivative of f(x) = x * ln(x) with respect to x for all x > 0?',
    options: ['1 + ln(x)', 'ln(x)', '1 / x', 'x / (1 + ln(x))'],
    correct: '1 + ln(x)',
    explanation: 'Using the product rule: d/dx[x * ln(x)] = (1)*ln(x) + x*(1/x) = ln(x) + 1.',
    difficulty: 'easy',
    subtopic: 'Product, Quotient & Chain Rules',
  },
  {
    text: 'Evaluate the limit: lim (x -> 0) of (sin(5x) - sin(3x)) / x:',
    options: ['2', '8', '15', '0'],
    correct: '2',
    explanation: 'Using standard limit lim(sin(kx)/x) = k: 5 - 3 = 2 (or by L\'Hôpital\'s Rule: lim (5cos(5x) - 3cos(3x))/1 = 5 - 3 = 2).',
    difficulty: 'easy',
    subtopic: 'Standard Limits & L\'Hôpital\'s Rule',
  },
  {
    text: 'Evaluate the definite integral ∫ from 0 to π/2 of (sin(x) / (sin(x) + cos(x))) dx:',
    options: ['π / 4', 'π / 2', '1', '0'],
    correct: 'π / 4',
    explanation: 'By King\'s property of definite integrals, I = ∫[0 to π/2] sin(x)/(sin(x)+cos(x)) dx = ∫[0 to π/2] cos(x)/(sin(x)+cos(x)) dx. Adding gives 2I = π/2 => I = π/4.',
    difficulty: 'tough',
    subtopic: 'Properties of Definite Integrals (King Rule)',
  },
  {
    text: 'If two vectors A = 2i + 3j - k and B = i - 2j + 4k are given, their scalar (dot) product A · B is:',
    options: ['-8', '10', '0', '4'],
    correct: '-8',
    explanation: 'A · B = (2*1) + (3*(-2)) + ((-1)*4) = 2 - 6 - 4 = -8.',
    difficulty: 'easy',
    subtopic: 'Scalar (Dot) & Vector (Cross) Products',
  },
  {
    text: 'Find the shortest distance between the lines r = (i + 2j + k) + λ(2i - j + k) and r = (2i - j - k) + μ(3i - 5j + 2k):',
    options: ['10 / √59', '14 / √59', '0 (Intersecting)', '5 / √29'],
    correct: '10 / √59',
    explanation: 'Shortest distance d = |(a2 - a1) · (b1 x b2)| / |b1 x b2|. b1 x b2 = (3i - j - 7k), magnitude √59. (a2 - a1) · (b1 x b2) = 1(3) + (-3)(-1) + (-2)(-7) = 20 - 10 = 10. Distance = 10/√59.',
    difficulty: 'tough',
    subtopic: 'Shortest Distance Between Skew Lines',
  },
  {
    text: 'If A is a square matrix of order 3 with |A| = 4, then the determinant of its adjoint matrix |adj(A)| is:',
    options: ['16', '64', '4', '12'],
    correct: '16',
    explanation: 'For an n x n matrix, |adj(A)| = |A|^(n - 1). Here n = 3, so |adj(A)| = |A|^(3 - 1) = 4^2 = 16.',
    difficulty: 'medium',
    subtopic: 'Adjoint & Inverse of Square Matrix',
  },
  {
    text: 'A fair die is rolled twice. What is the probability that the sum of the numbers appearing is 7?',
    options: ['1/6 (6 outcomes out of 36)', '1/12', '5/36', '7/36'],
    correct: '1/6 (6 outcomes out of 36)',
    explanation: 'Favorable pairs for sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 pairs. Total outcomes = 36. Probability = 6/36 = 1/6.',
    difficulty: 'easy',
    subtopic: 'Conditional Probability P(A|B)',
  },
];

// ==========================================
// CORE QUESTION BANK SERVICE
// ==========================================

const questionBank = {
  /**
   * Retrieves a non-repeating set of questions for a specific subject & chapter
   * @param {string} subject - Subject name (e.g. Biology, Physics, Chemistry, Math)
   * @param {string} chapter - Chapter topic (e.g. Genetics, Kinematics, Thermodynamics)
   * @param {number} requestedCount - Number of questions needed
   * @param {string[]} excludedQuestionTexts - Questions this user has already seen
   * @param {Object} options - { difficulty: 'easy' | 'medium' | 'tough' | 'all', subtopic: string }
   * @returns {Array} List of curated questions with shuffled options
   */
  getQuestionsForChapter(subject = 'Biology', chapter = 'Genetics', requestedCount = 10, excludedQuestionTexts = [], options = {}) {
    const s = String(subject || '').toLowerCase();
    const c = String(chapter || '').toLowerCase();
    const count = Math.max(3, parseInt(requestedCount, 10) || 10);
    const reqDiff = String(options.difficulty || 'all').toLowerCase();
    const reqSubtopic = options.subtopic && String(options.subtopic).toLowerCase() !== 'all subtopics' ? String(options.subtopic).toLowerCase() : null;

    // Build the master candidate pool for this subject/chapter
    let candidatePool = [];

    if (s.includes('bio')) {
      if (c.includes('inherit') || c.includes('genet') || c.includes('dna') || c.includes('molecul')) {
        candidatePool = [...BIOLOGY_GENETICS_QUESTIONS, ...BIOLOGY_CELL_PHYSIOLOGY_QUESTIONS];
      } else {
        candidatePool = [...BIOLOGY_CELL_PHYSIOLOGY_QUESTIONS, ...BIOLOGY_GENETICS_QUESTIONS];
      }
    } else if (s.includes('phys')) {
      if (c.includes('motion') || c.includes('kinematic') || c.includes('mechanic')) {
        candidatePool = [...PHYSICS_KINEMATICS_QUESTIONS, ...PHYSICS_LAWS_OF_MOTION_QUESTIONS];
      } else {
        candidatePool = [...PHYSICS_LAWS_OF_MOTION_QUESTIONS, ...PHYSICS_KINEMATICS_QUESTIONS];
      }
    } else if (s.includes('chem')) {
      candidatePool = [...CHEMISTRY_QUESTIONS];
    } else if (s.includes('math')) {
      candidatePool = [...MATHEMATICS_QUESTIONS];
    } else {
      // Default to balanced blend
      candidatePool = [
        ...BIOLOGY_GENETICS_QUESTIONS.slice(0, 5),
        ...PHYSICS_KINEMATICS_QUESTIONS.slice(0, 5),
        ...CHEMISTRY_QUESTIONS.slice(0, 5),
        ...MATHEMATICS_QUESTIONS.slice(0, 5),
      ];
    }

    // Filter by difficulty if user requested specific tier (easy, medium, tough/hard)
    if (reqDiff && reqDiff !== 'all' && reqDiff !== 'mixed') {
      const normalizedReq = reqDiff === 'tough' ? 'tough' : reqDiff;
      const filteredByDiff = candidatePool.filter((q) => {
        const qd = String(q.difficulty || 'medium').toLowerCase();
        if (normalizedReq === 'tough') return qd === 'tough' || qd === 'hard';
        return qd === normalizedReq;
      });
      if (filteredByDiff.length >= 3) {
        candidatePool = filteredByDiff;
      }
    }

    // Filter by subtopic if specified
    if (reqSubtopic) {
      const filteredBySub = candidatePool.filter((q) => {
        const qs = String(q.subtopic || '').toLowerCase();
        const qt = String(q.text || '').toLowerCase();
        return qs.includes(reqSubtopic) || reqSubtopic.includes(qs) || qt.includes(reqSubtopic);
      });
      if (filteredBySub.length >= 2) {
        candidatePool = filteredBySub;
      }
    }

    // If candidate pool is smaller than required, supplement with other genuine questions from the same subject
    if (candidatePool.length < count) {
      const subjectPool = subjectKey && ALL_POOLS[subjectKey] ? ALL_POOLS[subjectKey] : BIOLOGY_GENETICS_QUESTIONS;
      for (const q of subjectPool) {
        if (!candidatePool.some((c) => String(c.text || '').trim().toLowerCase() === String(q.text || '').trim().toLowerCase())) {
          candidatePool.push(q);
        }
      }
    }

    // Build exclusion set from user history (lowercase, trimmed)
    const excludedSet = new Set(
      (excludedQuestionTexts || []).map((t) => String(t || '').trim().toLowerCase())
    );

    // Deduplicate candidate pool
    const uniquePool = removeDuplicateQuestions(candidatePool);

    // Filter out already seen questions
    let freshQuestions = uniquePool.filter(
      (q) => !excludedSet.has(String(q.text || '').trim().toLowerCase())
    );

    // If user has seen all or almost all questions, reset exclusion pool so practice can continue seamlessly
    if (freshQuestions.length < count) {
      const seenQuestions = uniquePool.filter(
        (q) => excludedSet.has(String(q.text || '').trim().toLowerCase())
      );
      freshQuestions = removeDuplicateQuestions([...freshQuestions, ...shuffleArray(seenQuestions)]);
    }

    // Shuffle candidate selection
    const selectedQuestions = removeDuplicateQuestions(shuffleArray(freshQuestions)).slice(0, count);

    // Sort selected questions: Easy -> Medium -> Tough progression (if mixed)
    const diffOrder = { easy: 1, medium: 2, tough: 3, hard: 3 };
    selectedQuestions.sort((a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2));

    // Map each question: assign unique ID, randomize option positions (A, B, C, D), and clean strings
    const mappedQuestions = selectedQuestions.map((q, idx) => {
      const randomized = randomizeQuestionOptions({
        question_text: q.text,
        options: q.options,
        correct_answer: q.correct,
        explanation: q.explanation || `Core fundamental concept for ${chapter}.`,
      });

      return {
        id: `q-${Date.now()}-${idx + 1}-${Math.floor(Math.random() * 1000)}`,
        question_text: randomized.question_text,
        options: randomized.options,
        correct_answer: randomized.correct_answer,
        explanation: randomized.explanation,
        topic: chapter,
        subject: subject,
        difficulty: q.difficulty || (reqDiff !== 'all' ? reqDiff : 'medium'),
        subtopic: q.subtopic || options.subtopic || 'General',
      };
    });

    return removeDuplicateQuestions(mappedQuestions);
  },

  /**
   * Generates a blended multi-subject test distributing questions across subjects.
   * @param {string[]} subjects - Array of subjects (e.g. ['Physics', 'Chemistry', 'Mathematics'])
   * @param {Object} chapterMap - Map of subject -> chapter
   * @param {number} requestedCount - Total questions (e.g. 25, 50, 75, 100)
   * @param {string[]} excludedQuestionTexts - Seen questions
   * @param {Object} options - { difficulty, subtopic }
   */
  getMultiSubjectQuestions(subjects = [], chapterMap = {}, requestedCount = 30, excludedQuestionTexts = [], options = {}) {
    const activeSubjects = Array.isArray(subjects) && subjects.length > 0 ? subjects : ['Physics', 'Chemistry', 'Biology'];
    const totalCount = Math.max(3, parseInt(requestedCount, 10) || 30);
    const countPerSubject = Math.floor(totalCount / activeSubjects.length);
    const remainder = totalCount % activeSubjects.length;

    let allQuestions = [];
    activeSubjects.forEach((subj, idx) => {
      const qCount = countPerSubject + (idx < remainder ? 1 : 0);
      if (qCount <= 0) return;
      const chapter = chapterMap[subj] || (subj === 'Mathematics' ? 'Differential Calculus & Limits' : (subj === 'Physics' ? 'Motion in a Straight Line & Plane' : (subj === 'Chemistry' ? 'Chemical Bonding and Molecular Structure' : 'Principles of Inheritance and Variation')));
      const questions = this.getQuestionsForChapter(subj, chapter, qCount, excludedQuestionTexts, options);
      allQuestions.push(...questions);
    });

    return removeDuplicateQuestions(allQuestions);
  },
};

module.exports = questionBank;
