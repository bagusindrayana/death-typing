<script lang="ts">
    import { onMount } from "svelte";
    import * as PageFlip from "page-flip";

    let sentences: string[] = [];
    let specialWords: string[] = [];
    let personNames: string[] = [];
    let isLoadingContent = false;
    let contentError: string | null = null;
    let isInitialLoading = true;
    let currentWordCompleate = 0;

    // Game state
    let currentSentenceIndex = 0;
    let currentWordIndex = 0;
    let currentInput = "";
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let mistakes = 0;
    let isTyping = false;
    let gameStarted = false;

    // Timer and game completion
    let timeLimit = 360;
    let timeRemaining = timeLimit;
    let gameTimer: number | null = null;
    let gameCompleted = false;
    let showScoreboard = false;

    // Statistics tracking
    let correctWords = 0;
    let correctNames = 0;
    let correctSpecialWords = 0;
    let totalWordsTyped = 0;
    let typingStartTime: number | null = null;
    let typingEndTime: number | null = null;

    // Page state
    let currentPageIndex = 1; // Start from page 1 (0 is cover)
    let currentPageSide: "left" | "right" = "left";
    let pageContents: string[] = [];
    let currentLine = 0;
    let maxLinesPerPage = 16;
    let previousHeight = 0;
    let totalPage = 100;

    // Animation states
    let shakeWords: number[] = [];
    let strikethroughWords: number[] = [];

    // Word locking states
    let lockedWords: Set<number> = new Set();
    let lockedContent = "";
    let currentTypingWord = "";
    let lockedWordPositions: {
        start: number;
        end: number;
        wordIndex: number;
    }[] = [];

    // Animation states
    let animatedWords: Set<number> = new Set();
    let isAnimating = false;

    // Reactive statements with safeguards
    $: currentSentence = sentences[currentSentenceIndex] || "";
    $: words = currentSentence ? currentSentence.split(" ") : [];
    $: {
        // Ensure currentWordIndex doesn't exceed words array length
        if (currentWordCompleate >= words.length && words.length > 0) {
            console.warn(`Word index ${currentWordIndex} exceeds words length ${words.length}, resetting to trigger next sentence`);
            nextSentence();
        }
    }
    $: currentWord = words[currentWordIndex];
    $: isCurrentWordSpecial =
        currentWord != undefined &&
        specialWords.includes(currentWord.toLowerCase().replace(/[!?.,]/g, ""));
    $: globalWordIndex = calculateGlobalWordIndex(
        currentSentenceIndex,
        currentWordIndex,
    );
    
    // Calculate WPS (Words Per Second)
    $: wps = (() => {
        if (typingStartTime && typingEndTime && correctWords > 0) {
            const typingTimeInSeconds = (typingEndTime - typingStartTime) / 1000;
            return Math.round((correctWords / typingTimeInSeconds) * 100) / 100; // Round to 2 decimal places
        }
        return 0;
    })();

    let pageFlip: PageFlip.PageFlip;
    let inputElement: HTMLTextAreaElement;

    let ryukMessages = [
        "Make bukunya bukan begitu",
        "Bukan begitu cara makenya",
        "Cara kerjanya bukan begitu",
    ];

    let showRyuk = false;
    let ryukMessage =
        ryukMessages[Math.floor(Math.random() * ryukMessages.length)];
    let ryukBubbleMessage = false;
    let timeoutShowRyukMessage: any = null;

    function showRyukMessage() {
        ryukBubbleMessage = true;
        ryukMessage =
            ryukMessages[Math.floor(Math.random() * ryukMessages.length)];
        timeoutShowRyukMessage = setTimeout(() => {
            ryukBubbleMessage = false;
            timeoutShowRyukMessage = null;
        }, 5000);
    }

    function calculateGlobalWordIndex(
        sentenceIndex: number,
        wordIndex: number,
    ): number {
        let globalIndex = 0;
        for (let i = 0; i < sentenceIndex; i++) {
            if (sentences[i]) {
                globalIndex += sentences[i].split(" ").length;
            }
        }

        globalIndex += wordIndex;

        return globalIndex;
    }

    function startTimer() {
        timeRemaining = timeLimit;
        gameTimer = setInterval(() => {
            timeRemaining--;
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }

    function stopTimer() {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
        }
    }

    function endGame() {
        stopTimer();
        gameCompleted = true;
        showScoreboard = true;
        gameStarted = false;

        if (typingStartTime !== null) {
            typingEndTime = Date.now();
        }

        if (timeoutShowRyukMessage != null) {
            clearTimeout(timeoutShowRyukMessage);
        }
        ryukBubbleMessage = true;
        ryukMessage = "Gokil!";
        timeoutShowRyukMessage = setTimeout(() => {
            ryukBubbleMessage = false;
            timeoutShowRyukMessage = null;
        }, 5000);
    }

    function closeScoreboard() {
        showScoreboard = false;
        gameCompleted = false;
        gameStarted = false;
        if (pageFlip) {
            pageFlip.flip(0);
        }
    }

    function isPersonName(word: string): boolean {
        // Check if the word is a person name using API data
        const cleanWord = word.replace(/[!?.,]/g, "");
        
        const hasCapitalInMiddle = /[A-Z]/.test(cleanWord.slice(1));
        
        const isKnownName = personNames.some(name => {
            if (name.toLowerCase() === cleanWord.toLowerCase()) {
                return true;
            }
            const nameParts = name.split(' ');
            return nameParts.some(part => part.toLowerCase() === cleanWord.toLowerCase());
        });
        
        return hasCapitalInMiddle || isKnownName;
    }

    // API functions
    async function fetchContent() {
        if (isLoadingContent) return;

        isLoadingContent = true;
        contentError = null;

        try {
            const response = await fetch(
                "/api/generate?count=10&wordsPerSentence=12",
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.status}`);
            }

            const data = await response.json();
            sentences = data.sentences;
            specialWords = data.specialWords;
            personNames = data.personNames || [];

            console.log("Loaded content:", {
                sentenceCount: sentences.length,
                specialWordCount: specialWords.length,
                personNameCount: personNames.length,
            });
        } catch (error) {
            contentError =
                error instanceof Error
                    ? error.message
                    : "Failed to load content";
            console.error("Error fetching content:", error);

            // Fallback to default content
            sentences = [
                "I am justice! I protect the innocent and those who fear evil!",
                "This world is rotten and those who are making it rot deserve to die!",
                "The real evil is the power to kill people!",
                "I will reign over a new world as its god!",
                "Humans are so interesting!",
            ];
            specialWords = [
                "justice",
                "god",
                "death",
                "evil",
                "world",
                "detective",
            ];

            personNames = [
                "Light Yagami", "L Lawliet", "Misa Amane", "Near River", "Mello Keehl", 
                "Ryuk", "Rem", "Watari", "Matsuda", "Aizawa",
                "John Smith", "Jane Doe", "Michael Johnson", "Sarah Williams", "David Brown", 
                "Lisa Jones", "Chris Garcia", "Emma Miller", "Alex Davis", "Anna Rodriguez"
            ];
        } finally {
            isLoadingContent = false;
        }
    }

    function initBook() {
        if (pageFlip == undefined) {
            const bookElement = document.getElementById("book");
            if (!bookElement) {
                console.error("Book element not found");
                return;
            }

            pageFlip = new PageFlip.PageFlip(bookElement, {
                width: 400,
                height: 600,
                showCover: true,
                disableFlipByClick: true,
                useMouseEvents: false,
                clickEventForward: false,
                drawShadow: false,
            });
            pageFlip.loadFromHTML(document.querySelectorAll(".my-page"));
        } else {
            pageFlip.updateFromHtml(document.querySelectorAll(".my-page"));
        }
    }

    function triggerWordRevealAnimation() {
        if (isAnimating) return;

        isAnimating = true;

        const startGlobalIndex = calculateGlobalWordIndex(
            currentSentenceIndex,
            0,
        );

        // Animate words with staggered delay
        words.forEach((_, index) => {
            setTimeout(() => {
                const globalIndex = startGlobalIndex + index;
                animatedWords = new Set([...animatedWords, globalIndex]);

                // Mark animation as complete when last word is animated
                if (index === words.length - 1) {
                    setInterval(() => {
                        isAnimating = false;

                        if (inputElement) {
                            inputElement.focus();
                        }
                    }, 1000);
                }
            }, index * 30);
        });
    }

    function startGame() {
        showRyuk = true;
        gameStarted = true;
        gameCompleted = false;
        showScoreboard = false;

        initBook();
        resetGame();
        if (sentences.length === 0) {
            fetchContent().then(() => {
                setTimeout(() => {
                    pageFlip.flip(1);
                    triggerWordRevealAnimation();
                    startTimer();
                }, 100);
            });
        } else {
            setTimeout(() => {
                pageFlip.flip(1);
                triggerWordRevealAnimation();
                startTimer();
            }, 100);
        }
    }

    function resetGame() {
        currentSentenceIndex = 0;
        currentWordIndex = 0;
        currentInput = "";
        score = 0;
        combo = 0;
        maxCombo = 0;
        mistakes = 0;
        shakeWords = [];
        strikethroughWords = [];
        isTyping = false;

        stopTimer();
        timeRemaining = timeLimit;
        gameCompleted = false;
        showScoreboard = false;

        correctWords = 0;
        correctNames = 0;
        correctSpecialWords = 0;
        totalWordsTyped = 0;
        typingStartTime = null;
        typingEndTime = null;
        lockedWords = new Set();
        lockedContent = "";
        currentTypingWord = "";
        lockedWordPositions = [];

        animatedWords = new Set();
        isAnimating = false;

        currentPageIndex = 1;
        pageContents = [];
        currentPageSide = "left";
        currentLine = 0;
    }

    function restartGame() {
        showRyuk = true;
        resetGame();

        // Fetch fresh content for restart
        fetchContent().then(() => {
            setTimeout(() => {
                pageFlip.flip(1);
                triggerWordRevealAnimation();
                startTimer();
            }, 100);
        });
    }

    function handleInput(event: Event) {
        if (gameCompleted || timeRemaining <= 0) {
            event.preventDefault();
            return;
        }

        const target = event.target as HTMLTextAreaElement;
        const newValue = target.value;

        if (newValue.length < lockedContent.length) {
            target.value = lockedContent + currentTypingWord;
            currentInput = target.value;
            return;
        }

        currentInput = newValue;

        if (currentInput.length >= lockedContent.length) {
            currentTypingWord = currentInput.substring(lockedContent.length);
        }

        if (!isTyping && currentInput.length > 0) {
            isTyping = true;
            if (typingStartTime === null) {
                typingStartTime = Date.now();
            }
        }

        autoGrowTextarea(target);
        updateTypedContent();
    }

    function autoGrowTextarea(textarea: HTMLTextAreaElement) {
        textarea.style.height = "auto";

        const newHeight = Math.max(12, textarea.scrollHeight);
        if (previousHeight > 0 && newHeight > previousHeight) {
            addLineBreak();
        }

        textarea.style.height = newHeight + "px";
        previousHeight = newHeight;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            currentInput += "\n";
            //addLineBreak();
        } else if (event.key === " ") {
            event.preventDefault();
            checkWord();
        }
    }

    function addLineBreak() {
        // Store the current line content
        const lineContent = currentInput.trim();

        pageContents[currentPageIndex - 1] = lineContent;

        currentLine++;

        // Check if page is full
        if (currentLine >= maxLinesPerPage) {
            if (currentPageSide === "left") {
                currentPageSide = "right";
                currentLine = 0;
                currentInput = "";
                lockedContent = "";
                currentPageIndex += 1;
            } else {
                flipToNextPage();
                return;
            }
        }
        setTimeout(() => {
            if (inputElement) {
                inputElement.focus();
            }
        }, 0);
    }

    function checkWord() {
        if (gameCompleted || timeRemaining <= 0) {
            return; // Don't process input if game is over
        }

        // Additional safeguard: check if we're beyond the current sentence
        if (currentWordCompleate >= words.length) {
            console.warn(`Word index ${currentWordIndex} >= words length ${words.length}, moving to next sentence`);
            nextSentence();
            return;
        }

        if (currentWord == undefined) {
            // No more words, add space and continue
            currentInput += " ";
            currentTypingWord += " ";
            return;
        }

        const cleanWord = currentWord.replace(/[!?.,]/g, "");
        const cleanInput = currentTypingWord.trim().replace(/[!?.,]/g, "");
        const lastTypedWord = cleanInput.split(" ").pop() || "";

        totalWordsTyped++;
      

        if (lastTypedWord.toLowerCase() === cleanWord.toLowerCase()) {
            correctWords++;
            currentWordCompleate ++;
            if (isPersonName(currentWord)) {
                correctNames++;
                if (timeoutShowRyukMessage != null) {
                    clearTimeout(timeoutShowRyukMessage);
                }
                ryukBubbleMessage = true;
                ryukMessage = "Gokil!";
                timeoutShowRyukMessage = setTimeout(() => {
                    ryukBubbleMessage = false;
                    timeoutShowRyukMessage = null;
                }, 5000);
            } else {
                if (timeoutShowRyukMessage == null) {
                    showRyukMessage();
                }
            }

            if (isCurrentWordSpecial) {
                correctSpecialWords++;
            }

            lockedWords.add(globalWordIndex);
            strikethroughWords = [...strikethroughWords, globalWordIndex];

            // Store the position of this locked word
            const wordStart = lockedContent.length;
            const wordWithSpace = lastTypedWord + " ";
            const wordEnd = wordStart + wordWithSpace.length;

            lockedWordPositions.push({
                start: wordStart,
                end: wordEnd,
                wordIndex: globalWordIndex,
            });

            lockedContent += wordWithSpace;
            currentTypingWord = "";

            currentInput = lockedContent;

            // Calculate score
            let wordScore = 10;
            if (isCurrentWordSpecial) {
                wordScore = 25;
            }

            combo++;
            if (combo > 1) {
                wordScore *= Math.min(combo, 10);
            }

            score += wordScore;
            maxCombo = Math.max(maxCombo, combo);

            currentWordIndex++;
            
            // Robust check to ensure we move to next sentence
            // Handle edge cases where currentWordIndex might not match exactly
            if (currentWordCompleate >= words.length || currentWordCompleate >= currentSentence.split(" ").length) {
                nextSentence();
            }
        } else {
            shakeWords = [...shakeWords, globalWordIndex];
            combo = 0;
            mistakes++;
            currentTypingWord += " ";
            currentInput = lockedContent + currentTypingWord;

            // Remove shake effect after animation
            setTimeout(() => {
                shakeWords = shakeWords.filter((i) => i !== globalWordIndex);
            }, 600);
        }

        updateTypedContent();
    }

    function updateTypedContent() {
        pageContents[currentPageIndex - 1] = currentInput;
    }

    function nextSentence() {
        currentWordCompleate = 0;
        console.log(`Moving to next sentence. Current: ${currentSentenceIndex}, Word: ${currentWordIndex}/${words.length}`);
        
        if (sentences.length === 0) {
            fetchContent().then(() => {
                if (sentences.length > 0) {
                    currentSentenceIndex =
                        (currentSentenceIndex + 1) % sentences.length;
                    currentWordIndex = 0; // Ensure reset
                    triggerWordRevealAnimation();
                }
            });
            return;
        }

        currentSentenceIndex = (currentSentenceIndex + 1) % sentences.length;
        currentWordIndex = 0; // Always reset to 0 for new sentence

        if (currentInput.trim().length > 0) {
            currentInput += " ";
            lockedContent += " ";
        }

        currentTypingWord = "";
        
        console.log(`Next sentence set. New: ${currentSentenceIndex}, Word reset to: ${currentWordIndex}`);
        triggerWordRevealAnimation();
    }

    function flipToNextPage() {
        const oldPageIndex = currentPageIndex;
        currentPageIndex += 1;
        pageFlip.flip(currentPageIndex);
        setTimeout(() => {
           

            // Reset for new page
            currentPageSide = "left";
            currentLine = 0;

            if(isTyping){
                const lastInput = currentInput.split(" ")[currentInput.split(" ").length - 1];
                const lastTypedWord = currentTypingWord.split(" ")[currentTypingWord.split(" ").length - 1];
                currentInput = lastInput;
                currentTypingWord = lastTypedWord;
                pageContents[oldPageIndex].replace(" "+lastInput,"")
            } else {
                currentInput = "";
                currentTypingWord = "";
            }
            
            lockedContent = "";
            if (inputElement) {
                inputElement.style.height = "auto";
                inputElement.focus();
            }
        }, 800);
    }

    onMount(async () => {
        try {
            // Initialize the book
            initBook();
            
            // Fetch initial content to prepare the app
            await fetchContent();
            
            // Small delay to ensure smooth transition
            setTimeout(() => {
                isInitialLoading = false;
            }, 800);
        } catch (error) {
            console.error('Error during app initialization:', error);
            // Even if there's an error, hide the loading screen
            setTimeout(() => {
                isInitialLoading = false;
            }, 1000);
        }
    });
</script>

<svelte:head>
    <title>Death Typing</title>
</svelte:head>

<main
    class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white overflow-hidden"
>
    <!-- Background pattern -->
    <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0 bg-dots"></div>
    </div>

    <!-- Initial Loading Screen -->
    {#if isInitialLoading}
        <div class="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black z-50 flex items-center justify-center">
            <div class="text-center space-y-8">
                <!-- Death Note Logo/Title -->
                <div class="death-font text-6xl md:text-8xl font-bold text-red-500 death-glow mb-8">
                    Death Typing
                </div>
                
                <!-- Loading Animation -->
                <div class="flex justify-center items-center space-x-2">
                    <div class="w-4 h-4 bg-red-500 rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
                    <div class="w-4 h-4 bg-red-500 rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
                    <div class="w-4 h-4 bg-red-500 rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
                </div>
                
                <!-- Loading Text -->
                <div class="text-gray-300 text-lg font-semibold">
                    {#if isLoadingContent}
                        Loading content...
                    {:else}
                        Initializing...
                    {/if}
                </div>
                
                <!-- Error Message if any -->
                {#if contentError}
                    <div class="text-yellow-500 text-sm max-w-md mx-auto">
                        <p class="mb-2">⚠️ Warning: {contentError}</p>
                        <p class="text-gray-400">Using fallback content...</p>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Start screen -->
    <div class="relative z-10 min-h-screen w-full py-6 space-y-4">
        <div class="min-h-[100px]">
            {#if gameStarted}
                <!-- Game interface -->
                <div class="relative z-10 p-8">
                    <!-- Score display -->
                    <div class="flex justify-between items-center mb-8">
                        <div class="flex space-x-8">
                            <div class="text-center">
                                <div class="text-3xl font-bold text-red-500">
                                    {score}
                                </div>
                                <div class="text-sm text-gray-400">Score</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-yellow-500">
                                    {combo}x
                                </div>
                                <div class="text-sm text-gray-400">Combo</div>
                            </div>
                            <div class="text-center">
                                <div class="text-xl font-bold text-green-500">
                                    {maxCombo}x
                                </div>
                                <div class="text-sm text-gray-400">Best</div>
                            </div>
                            <div class="text-center">
                                <div class="text-xl font-bold text-red-400">
                                    {mistakes}
                                </div>
                                <div class="text-sm text-gray-400">
                                    Mistakes
                                </div>
                            </div>
                        </div>

                        <div class="text-center death-font">
                            <div
                                class="font-bold"
                                class:text-red-500={timeRemaining <= 10}
                                class:text-yellow-500={timeRemaining > 10}
                            >
                                <span class="text-4xl">{timeRemaining}</span
                                ><small>s</small>
                            </div>
                            <div class="text-sm text-gray-400">Time</div>
                        </div>

                        <button
                            on:click={restartGame}
                            class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                        >
                            Restart
                        </button>
                    </div>

                    <!-- Clipping text display -->
                    <div>
                        <div
                            class="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto"
                        >
                            {#each words as word, index}
                                {@const globalIndex = calculateGlobalWordIndex(
                                    currentSentenceIndex,
                                    index,
                                )}
                                <div
                                    class:animate-shake={shakeWords.includes(
                                        globalIndex,
                                    )}
                                >
                                    <div
                                        class="relative"
                                        class:animate-fadeInBounce={animatedWords.has(
                                            globalIndex,
                                        )}
                                        class:word-hidden={!animatedWords.has(
                                            globalIndex,
                                        )}
                                        style="animation-delay: {index * 30}ms;"
                                    >
                                        <!-- Paper clipping background -->
                                        <div
                                            class="px-4 py-2 transform -rotate-2 shadow-lg relative clip-paper transition-all duration-300"
                                            class:bg-red-600={specialWords.includes(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            ) || isPersonName(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            )}
                                            class:bg-gray-200={!specialWords.includes(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            ) && !lockedWords.has(globalIndex) && !isPersonName(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            )}
                                            class:bg-black={lockedWords.has(
                                                globalIndex,
                                            ) &&
                                                !specialWords.includes(
                                                    word
                                                        .toLowerCase()
                                                        .replace(/[!?.,]/g, ""),
                                                )}
                                            class:bg-red-900={lockedWords.has(
                                                globalIndex,
                                            ) &&
                                                (specialWords.includes(
                                                    word
                                                        .toLowerCase()
                                                        .replace(/[!?.,]/g, ""),
                                                ) || isPersonName(
                                                    word
                                                        .toLowerCase()
                                                        .replace(/[!?.,]/g, ""),
                                                ))}
                                            class:text-white={specialWords.includes(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            ) || lockedWords.has(globalIndex) || isPersonName(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            )}
                                            class:text-black={!specialWords.includes(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            ) && !lockedWords.has(globalIndex) && !isPersonName(
                                                word
                                                    .toLowerCase()
                                                    .replace(/[!?.,]/g, ""),
                                            )}
                                            class:animate-pulse={index ===
                                                currentWordIndex}
                                            style="transform: rotate({Math.floor(
                                                Math.random() * 11,
                                            ) - 5}deg);"
                                        >
                                            <span
                                                class="relative text-2xl font-bold"
                                                style="text-decoration-color:white;"
                                                class:line-through={strikethroughWords.includes(
                                                    globalIndex,
                                                )}
                                                class:text-current={index !==
                                                    currentWordIndex}
                                                class:text-red-600={index ===
                                                    currentWordIndex &&
                                                    !specialWords.includes(
                                                        word
                                                            .toLowerCase()
                                                            .replace(
                                                                /[!?.,]/g,
                                                                "",
                                                            ),
                                                    ) && !isPersonName(
                                                        word
                                                            .toLowerCase()
                                                            .replace(
                                                                /[!?.,]/g,
                                                                "",
                                                            ),
                                                    )}
                                                class:text-yellow-200={index ===
                                                    currentWordIndex &&
                                                    specialWords.includes(
                                                        word
                                                            .toLowerCase()
                                                            .replace(
                                                                /[!?.,]/g,
                                                                "",
                                                            ),
                                                    )}
                                                class:animate-pulse={index ===
                                                    currentWordIndex}
                                            >
                                                {word}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}
        </div>
        <div
            class="relative transition-all duration-500 ease-in-out mx-auto w-full flex justify-center"
            class:slide-book={gameStarted}
            class:slide-book-close={!gameStarted}
        >
            <div id="book">
                <div
                    class="my-page bg-black p-2 relative cover-page"
                    data-density="hard"
                >
                    <div
                        class="flex justify-center items-center text-white text-4xl font-bold tracking w-full h-full"
                    >
                        Death Typing
                    </div>
                </div>
                {#each Array(totalPage) as _, totalPageIndex}
                    {#if totalPageIndex % 2 == 0 || totalPageIndex == 0}
                        <!-- Left Page -->
                        <div
                            class="my-page bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg shadow-2xl p-8 relative transform book-page"
                        >
                            <!-- Page lines -->
                            <div class="absolute inset-8 pointer-events-none">
                                {#each Array(16) as _, i}
                                    <div
                                        class="border-b border-blue-200 opacity-50 h-8"
                                    ></div>
                                {/each}
                            </div>

                            <div class="relative z-10 pl-1">
                                <!-- Display typed lines -->
                                {#if currentPageSide === "left" && currentPageIndex - 1 == totalPageIndex}
                                    <textarea
                                        bind:this={inputElement}
                                        bind:value={currentInput}
                                        on:input={handleInput}
                                        on:keydown={handleKeydown}
                                        placeholder="Type here..."
                                        class="w-full bg-transparent border-none outline-none text-lg text-gray-800 font-mono leading-8 pr-4 resize-none overflow-hidden"
                                        style="font-family: 'Courier New', monospace; max-width: calc(100% - 2rem); min-height: 2rem;"
                                        autocomplete="off"
                                        spellcheck="false"
                                        rows="1"
                                    ></textarea>
                                {:else}
                                    <div
                                        class="h-8 leading-8 text-gray-800 font-mono text-lg"
                                        style="font-family: 'Courier New', monospace;"
                                    >
                                        <span
                                            >{pageContents[
                                                totalPageIndex
                                            ]}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <!-- Right Page -->
                        <div
                            class="my-page bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg shadow-2xl p-8 relative transform book-page"
                        >
                            <!-- Page lines -->
                            <div class="absolute inset-8 pointer-events-none">
                                {#each Array(16) as _, i}
                                    <div
                                        class="border-b border-blue-200 opacity-50 h-8"
                                    ></div>
                                {/each}
                            </div>

                            <div class="relative z-10 pl-1">
                                {#if currentPageSide === "right" && currentPageIndex - 1 == totalPageIndex}
                                    <textarea
                                        bind:this={inputElement}
                                        bind:value={currentInput}
                                        on:input={handleInput}
                                        on:keydown={handleKeydown}
                                        placeholder="Type here..."
                                        class="w-full bg-transparent border-none outline-none text-lg text-gray-800 font-mono leading-8 pr-4 resize-none overflow-hidden"
                                        style="font-family: 'Courier New', monospace; max-width: calc(100% - 2rem); min-height: 2rem;"
                                        autocomplete="off"
                                        spellcheck="false"
                                        rows="1"
                                    ></textarea>
                                {:else}
                                    <div
                                        class="h-8 leading-8 text-gray-800 font-mono text-lg"
                                        style="font-family: 'Courier New', monospace;"
                                    >
                                        <span
                                            >{pageContents[
                                                totalPageIndex
                                            ]}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                {/each}

                <div class="my-page bg-black p-2 relative" data-density="hard">
                    <div
                        class="flex justify-center items-center text-white text-xl font-bold w-full h-full"
                    >
                        The End
                    </div>
                </div>
            </div>
        </div>

        {#if !gameStarted}
            <div class="text-center">
                <button
                    on:click={startGame}
                    disabled={isLoadingContent}
                    class="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    {#if isLoadingContent}
                        <div class="flex items-center justify-center space-x-2">
                            <div class="w-4 h-4 bg-white rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
                            <div class="w-4 h-4 bg-white rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
                            <div class="w-4 h-4 bg-white rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
                            <span class="ml-2">Loading...</span>
                        </div>
                    {:else}
                        Start Typing Test
                    {/if}
                </button>
            </div>
        {:else}
            {#if ryukBubbleMessage}
                <div
                    class="fixed right-10 z-50 animate-bounceMessage"
                    style="bottom: 540px; right: 140px;"
                >
                    <div class="speech-bubble">
                        {ryukMessage}
                    </div>
                </div>
            {/if}
            {#if showRyuk}
                <div class="fixed bottom-10 right-10 z-50 animate-ryukShow">
                    <img
                        src="/images/Ryuk-Shinigami-PNG-HD-Quality.png"
                        alt=""
                        style="height: 500px;"
                    />
                </div>
            {/if}
        {/if}
        

        
    </div>

    <!-- Scoreboard Modal -->
    {#if showScoreboard}
        <div
            class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            on:click={closeScoreboard}
        >
            <div
                class="relative bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-red-600"
                on:click|stopPropagation
            >
                <div class="text-center mb-6">
                    <h2 class="text-4xl font-bold text-red-500 mb-2 death-glow">
                        GAME OVER
                    </h2>
                    <p class="text-gray-300">
                        Time's up! Here are your results:
                    </p>
                </div>

                <div class="space-y-4 mb-6">
                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Final Score:</span>
                        <span class="text-3xl font-bold text-red-500"
                            >{score}</span
                        >
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Max Combo:</span>
                        <span class="text-xl font-bold text-yellow-500"
                            >{maxCombo}x</span
                        >
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Accuracy:</span>
                        <span class="text-lg font-bold text-green-500">
                            {totalWordsTyped > 0
                                ? Math.round(
                                      (correctWords / totalWordsTyped) * 100,
                                  )
                                : 0}%
                        </span>
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">WPS:</span>
                        <span class="text-lg font-bold text-cyan-500">
                            {wps} words/sec
                        </span>
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Words Typed:</span>
                        <span class="text-lg font-bold text-blue-500"
                            >{totalWordsTyped}</span
                        >
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Correct Words:</span>
                        <span class="text-lg font-bold text-green-500"
                            >{correctWords}</span
                        >
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Correct Names:</span>
                        <span class="text-lg font-bold text-purple-500"
                            >{correctNames}</span
                        >
                    </div>

                    <div
                        class="flex justify-between items-center py-2 border-b border-gray-700"
                    >
                        <span class="text-gray-300">Special Words:</span>
                        <span class="text-lg font-bold text-orange-500"
                            >{correctSpecialWords}</span
                        >
                    </div>

                    <div class="flex justify-between items-center py-2">
                        <span class="text-gray-300">Mistakes:</span>
                        <span class="text-lg font-bold text-red-400"
                            >{mistakes}</span
                        >
                    </div>
                </div>

                <div class="flex space-x-4">
                    <button
                        on:click={startGame}
                        class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                    >
                        Play Again
                    </button>
                    <button
                        on:click={closeScoreboard}
                        class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                    >
                        Close
                    </button>
                </div>
                <div
                    class="absolute right-10 top-30 w-auto z-50 animate-ryukShow"
                    style="right: -70%;"
                >
                    <div class="absolute" style="top:-100px; right: 100px;">
                        <div class="speech-bubble">Gokil</div>
                    </div>
                    <img
                        src="/images/Ryuk-Shinigami-PNG-HD-Quality.png"
                        alt=""
                        style="height: 500px;"
                    />
                </div>
            </div>
        </div>
    {/if}
</main>

<style>
    .bg-dots {
        background-image: radial-gradient(circle, #ffffff 1px, transparent 1px);
        background-size: 40px 40px;
    }

    .clip-paper {
        font-family: "serif";
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
    }

    .book-page {
        perspective: 1000px;
    }

    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        10%,
        30%,
        50%,
        70%,
        90% {
            transform: translateX(-2px);
        }
        20%,
        40%,
        60%,
        80% {
            transform: translateX(2px);
        }
    }

    @keyframes fadeInBounce {
        0% {
            opacity: 0;
            transform: translateY(-40px) rotate(-5deg);
        }
        60% {
            opacity: 1;
            transform: translateY(8px) rotate(2deg);
        }
        80% {
            transform: translateY(-3px) rotate(-1deg);
        }
        100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
        }
    }

    @keyframes flip {
        0% {
            transform: rotateY(0deg);
        }
        50% {
            transform: rotateY(-90deg);
        }
        100% {
            transform: rotateY(0deg);
        }
    }

    .animate-shake {
        animation: shake 0.6s ease-in-out;
    }

    .animate-fadeInBounce {
        animation: fadeInBounce 0.3s ease-out;
        animation-fill-mode: both;
    }

    .word-hidden {
        opacity: 0;
        transform: translateY(-40px) scale(0.7) rotate(-5deg);
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }

    .animate-pulse {
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes ryukShow {
        0% {
            opacity: 0;
            transform: translateY(-40px);
        }
        50% {
            opacity: 1;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0px);
        }
    }

    .animate-ryukShow {
        animation: ryukShow 1s ease-in-out;
    }

    @keyframes bounceMessage {
        0% {
            opacity: 0;
            transform: scale(0.6);
        }

        100% {
            opacity: 1;
            transform: scale(1);
        }
    }

    .animate-bounceMessage {
        animation: bounceMessage 200ms ease-in-out;
    }
    
    /* Death glow effect for loading screen */
    .death-glow {
        text-shadow: 
            0 0 5px #ef4444,
            0 0 10px #ef4444,
            0 0 15px #ef4444,
            0 0 20px #dc2626,
            0 0 25px #dc2626;
        animation: pulse-glow 2s ease-in-out infinite alternate;
    }
    
    @keyframes pulse-glow {
        from {
            text-shadow: 
                0 0 5px #ef4444,
                0 0 10px #ef4444,
                0 0 15px #ef4444,
                0 0 20px #dc2626,
                0 0 25px #dc2626;
        }
        to {
            text-shadow: 
                0 0 10px #ef4444,
                0 0 15px #ef4444,
                0 0 20px #ef4444,
                0 0 25px #dc2626,
                0 0 30px #dc2626,
                0 0 35px #dc2626;
        }
    }
</style>
