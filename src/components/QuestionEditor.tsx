import type { Category, Question } from "../engine/types";
import { saveImage } from "../data/repository";
import { BulkImport } from "./BulkImport";

export function QuestionEditor({
  category,
  onChange,
  onBulkCommit,
  onDelete,
}: {
  category: Category;
  onChange: (c: Category) => void;
  onDelete: (question: Question, index: number) => void;
  onBulkCommit?: (
    questions: Question[],
    blobs: Array<{ id: string; blob: Blob }>,
  ) => Promise<void>;
}) {
  const update = (i: number, patch: Partial<Question>) =>
    onChange({
      ...category,
      questions: category.questions.map((q, n) =>
        n === i ? { ...q, ...patch } : q,
      ),
    });
  return (
    <div className="question-editor">
      {onBulkCommit && (
        <BulkImport category={category} onCommit={onBulkCommit} />
      )}{" "}
      {category.questions.map((q, i) => (
        <fieldset key={q.id}>
          <legend>Question {i + 1}</legend>
          <label>
            Prompt
            <textarea
              value={q.text ?? ""}
              onChange={(e) => update(i, { text: e.target.value })}
            />
          </label>
          <label>
            Image
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const id = crypto.randomUUID();
                  await saveImage(id, file);
                  update(i, { imageId: id });
                }
              }}
            />
          </label>
          <label>
            Answer for {category.name} question {i + 1}
            <input
              value={q.answer}
              onChange={(e) => update(i, { answer: e.target.value })}
            />
          </label>
          <label>
            Accepted answers
            <input
              value={q.acceptedAnswers.join(", ")}
              onChange={(e) =>
                update(i, {
                  acceptedAnswers: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <button
            type="button"
            className="danger delete-question"
            aria-label={`Delete ${category.name} question ${i + 1}`}
            onClick={() => onDelete(q, i)}
          >
            Delete question
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        disabled={category.questions.length >= 50}
        onClick={() =>
          onChange({
            ...category,
            questions: [
              ...category.questions,
              {
                id: crypto.randomUUID(),
                text: "",
                answer: "",
                acceptedAnswers: [],
              },
            ],
          })
        }
      >
        Add question
      </button>
    </div>
  );
}
