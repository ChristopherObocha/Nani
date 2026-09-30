import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameSnapshot } from "../engine/types";
import { createConfiguredGame, validateSetup } from "../engine/setup";
import { SetupScreen } from "./SetupScreen";
import { HostGame } from "./HostGame";
import { PublicDisplay } from "./PublicDisplay";
import { ProfileReveal } from "./ProfileReveal";
import { publicSnapshot } from "../engine/game";

function SetupHarness() {
  const [game, setGame] = useState(() => {
    const state = createConfiguredGame(["Ada", "Bo"], 1);
    state.categories[0].questions = [
      {
        id: "first",
        text: "First prompt",
        answer: "First answer",
        acceptedAnswers: ["one"],
        imageId: "saved-image",
      },
      {
        id: "second",
        text: "Second prompt",
        answer: "Second answer",
        acceptedAnswers: [],
      },
    ];
    return state;
  });
  return <SetupScreen game={game} onChange={setGame} onBuild={() => {}} />;
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("question deletion", () => {
  it("undo restores deleted questions in order with their answers and image references, preserving other edits", () => {
    vi.useFakeTimers();
    render(<SetupHarness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Ada topic 1 question 1" }),
    );
    expect(screen.queryByDisplayValue("First answer")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Question deleted");
    fireEvent.change(screen.getByDisplayValue("Second answer"), {
      target: { value: "Edited answer" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Ada topic 1 question 1" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("2 questions deleted");
    fireEvent.click(screen.getByRole("button", { name: /Undo/ }));
    expect(
      screen.getByLabelText("Answer for Ada topic 1 question 1"),
    ).toHaveValue("First answer");
    expect(screen.getByDisplayValue("one")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Answer for Ada topic 1 question 2"),
    ).toHaveValue("Edited answer");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("dismisses the undo window after 3s without restoring the question", () => {
    vi.useFakeTimers();
    render(<SetupHarness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Ada topic 1 question 1" }),
    );
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("First answer")).not.toBeInTheDocument();
  });
  it("does not allow a board with an empty active question category", () => {
    const game = createConfiguredGame(["Ada", "Bo"]);
    game.categories[0].questions = [];
    expect(validateSetup(game)).toContain(
      "Ada topic 1 needs at least one question",
    );
  });
});

describe("host and public duel display", () => {
  it("randomises for four seconds, stages the duel, then starts both views after five seconds", () => {
    vi.useFakeTimers();
    function Harness() {
      const [game, setGame] = useState<GameSnapshot>(() => ({
        ...createConfiguredGame(["Ada", "Bo"], 1),
        phase: "selecting",
      }));
      const change = (next: GameSnapshot) => {
        setGame(next);
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "floor-game-public-state",
            newValue: JSON.stringify(publicSnapshot(next)),
          }),
        );
      };
      return (
        <HostGame
          game={game}
          onChange={change}
          onBack={() => {}}
          onReset={() => {}}
        />
      );
    }
    const host = render(<Harness />);
    const publicView = render(<PublicDisplay />);
    fireEvent.click(screen.getByRole("button", { name: "Random challenger" }));
    expect(
      screen.getByRole("button", { name: /Choosing challenger/ }),
    ).toBeDisabled();
    act(() => vi.advanceTimersByTime(3950));
    expect(
      screen.queryByRole("button", { name: /^Challenge / }),
    ).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(50));
    fireEvent.click(screen.getByRole("button", { name: /^Challenge / }));
    expect(
      within(host.container).getByRole("region", { name: "Current duel" }),
    ).toBeInTheDocument();
    expect(
      within(publicView.container).getByRole("region", {
        name: "Current duel",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sample question")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getAllByText("Awaiting host")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Begin duel/ }));
    expect(
      screen.getAllByRole("status", { name: "Duel starts in 5 seconds" }),
    ).toHaveLength(2);
    act(() => vi.advanceTimersByTime(4000));
    expect(
      screen.getAllByRole("status", { name: "Duel starts in 1 seconds" }),
    ).toHaveLength(2);
    expect(screen.queryByText("Private answer")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getAllByText("Sample question")).toHaveLength(2);
    expect(
      within(host.container).getByText("Sample answer"),
    ).toBeInTheDocument();
    expect(
      within(publicView.container).queryByText("Sample answer"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("45", { selector: ".clock" })).toHaveLength(4);
  });
  it("reveals a contestant profile on click", () => {
    render(<ProfileReveal name="Ada" metadata="3 tiles · Challenger" />);
    const button = screen.getByRole("button", {
      name: "Reveal contestant profile",
    });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(
      screen.getByRole("button", { name: "Ada, 3 tiles · Challenger" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
