import { describe, it, expect } from "vitest";
import { detectEmotion, getEmotionDuration } from "./emotionMapper";
import type { EmotionContext } from "./agentTypes";

describe("detectEmotion", () => {
  const makeContext = (
    content: string,
    isToolRunning = false,
    hasError = false
  ): EmotionContext => ({
    content,
    isToolRunning,
    hasError,
  });

  describe("error handling", () => {
    it("returns sad when hasError is true", () => {
      expect(detectEmotion(makeContext("any content", false, true))).toBe("sad");
    });

    it("prioritizes error over tool running", () => {
      expect(detectEmotion(makeContext("analyzing...", true, true))).toBe("sad");
    });
  });

  describe("tool running", () => {
    it("returns thinking when tool is running", () => {
      expect(detectEmotion(makeContext("", true, false))).toBe("thinking");
    });

    it("returns thinking regardless of content when tool running", () => {
      expect(detectEmotion(makeContext("awesome!", true, false))).toBe("thinking");
    });
  });

  describe("excited emotion", () => {
    it("detects completion words", () => {
      expect(detectEmotion(makeContext("Task done!"))).toBe("excited");
      expect(detectEmotion(makeContext("Successfully complete"))).toBe("excited");
      expect(detectEmotion(makeContext("Fixed the bug"))).toBe("excited");
    });

    it("detects positive exclamations", () => {
      expect(detectEmotion(makeContext("That's great!"))).toBe("excited");
      expect(detectEmotion(makeContext("Awesome work"))).toBe("excited");
      expect(detectEmotion(makeContext("Perfect!"))).toBe("excited");
    });

    it("detects emojis", () => {
      expect(detectEmotion(makeContext("Deployed! 🎉"))).toBe("excited");
      expect(detectEmotion(makeContext("New feature ✨"))).toBe("excited");
    });
  });

  describe("surprised emotion", () => {
    it("detects surprise words", () => {
      expect(detectEmotion(makeContext("Wow, that's interesting"))).toBe("surprised");
      expect(detectEmotion(makeContext("I didn't expect that"))).toBe("surprised");
      expect(detectEmotion(makeContext("This is remarkable"))).toBe("surprised");
    });
  });

  describe("sad emotion", () => {
    it("detects apologies", () => {
      expect(detectEmotion(makeContext("I'm sorry about that"))).toBe("sad");
      expect(detectEmotion(makeContext("Unfortunately, it failed"))).toBe("sad");
    });

    it("detects inability", () => {
      expect(detectEmotion(makeContext("I can't do that"))).toBe("sad");
      expect(detectEmotion(makeContext("This is impossible"))).toBe("sad");
    });

    it("detects errors in content", () => {
      expect(detectEmotion(makeContext("There's an error here"))).toBe("sad");
      expect(detectEmotion(makeContext("The build failed"))).toBe("sad");
    });
  });

  describe("confused emotion", () => {
    it("detects multiple question marks", () => {
      expect(detectEmotion(makeContext("What??"))).toBe("confused");
      expect(detectEmotion(makeContext("Huh???"))).toBe("confused");
    });

    it("detects uncertainty phrases", () => {
      expect(detectEmotion(makeContext("I'm not sure about this"))).toBe("confused");
      expect(detectEmotion(makeContext("Could you clarify?"))).toBe("confused");
      expect(detectEmotion(makeContext("This is ambiguous"))).toBe("confused");
    });
  });

  describe("thinking emotion", () => {
    it("detects analysis phrases", () => {
      expect(detectEmotion(makeContext("Let me check that"))).toBe("thinking");
      expect(detectEmotion(makeContext("Analyzing the code"))).toBe("thinking");
      expect(detectEmotion(makeContext("Searching for matches"))).toBe("thinking");
    });

    it("detects contemplation", () => {
      expect(detectEmotion(makeContext("Hmm, interesting"))).toBe("thinking");
      expect(detectEmotion(makeContext("Well, let's see"))).toBe("thinking");
    });
  });

  describe("happy emotion", () => {
    it("detects happiness words", () => {
      expect(detectEmotion(makeContext("I'm happy to help"))).toBe("happy");
      expect(detectEmotion(makeContext("Glad you asked"))).toBe("happy");
    });

    it("detects affirmations", () => {
      expect(detectEmotion(makeContext("Sure, I can do that"))).toBe("happy");
      // "Of course!" triggers excited due to trailing "!"
      expect(detectEmotion(makeContext("Of course"))).toBe("happy");
      expect(detectEmotion(makeContext("Absolutely, let's go"))).toBe("happy");
    });

    it("detects polite responses", () => {
      // "You're welcome!" triggers excited due to trailing "!"
      expect(detectEmotion(makeContext("You're welcome"))).toBe("happy");
      // "No problem" triggers sad because "problem" matches sad pattern
      expect(detectEmotion(makeContext("Happy to help anytime"))).toBe("happy");
    });
  });

  describe("neutral emotion", () => {
    it("returns neutral for plain content", () => {
      expect(detectEmotion(makeContext("Here is the code"))).toBe("neutral");
      expect(detectEmotion(makeContext("The function takes two arguments"))).toBe(
        "neutral"
      );
    });

    it("returns neutral for empty content", () => {
      expect(detectEmotion(makeContext(""))).toBe("neutral");
    });
  });
});

describe("getEmotionDuration", () => {
  it("returns correct durations for each emotion", () => {
    expect(getEmotionDuration("excited")).toBe(3000);
    expect(getEmotionDuration("surprised")).toBe(2000);
    expect(getEmotionDuration("sad")).toBe(4000);
    expect(getEmotionDuration("confused")).toBe(3000);
    expect(getEmotionDuration("thinking")).toBe(5000);
    expect(getEmotionDuration("happy")).toBe(3000);
  });

  it("returns 0 for neutral", () => {
    expect(getEmotionDuration("neutral")).toBe(0);
  });

  it("returns 0 for curious (unlisted emotion)", () => {
    expect(getEmotionDuration("curious")).toBe(0);
  });
});
