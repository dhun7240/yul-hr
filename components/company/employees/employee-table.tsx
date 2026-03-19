"use client";

type EmployeeListItem = {
  id: string;
  name: string;
  department: string;
  position: string;
  employment_type: string;
};

type EmployeeTableProps = {
  employees: EmployeeListItem[];
  selectedEmployeeId: string;
  deletingId?: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function cardClass() {
  return "rounded-[28px] border border-zinc-200 bg-white px-0 py-0 shadow-sm overflow-hidden";
}

function cellBaseClass() {
  return "border-b border-zinc-100 px-6 py-4 text-sm align-middle";
}

function headBaseClass() {
  return "border-b border-zinc-200 px-6 py-4 text-left text-sm font-bold text-zinc-600 align-middle";
}

export default function EmployeeTable({
  employees,
  selectedEmployeeId,
  deletingId,
  isOpen,
  onToggle,
  onSelect,
  onDelete,
}: EmployeeTableProps) {
  return (
    <section className={`${cardClass()} max-w-[1180px]`}>
      <div className="border-b border-zinc-200 px-6 py-5 md:px-8 md:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold tracking-wide text-orange-500">
              EMPLOYEE LIST
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
              직원 명단
            </h2>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
          >
            {isOpen ? "명단 닫기" : "명단 보기"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="overflow-x-auto">
          <table className="w-max min-w-[900px] border-collapse md:min-w-full">
            <thead>
              <tr className="bg-zinc-50">
                <th className={`${headBaseClass()} min-w-[160px] whitespace-nowrap`}>
                  이름
                </th>
                <th className={`${headBaseClass()} min-w-[180px] whitespace-nowrap`}>
                  부서
                </th>
                <th className={`${headBaseClass()} min-w-[180px] whitespace-nowrap`}>
                  직책
                </th>
                <th className={`${headBaseClass()} min-w-[160px] whitespace-nowrap`}>
                  고용형태
                </th>
                <th className={`${headBaseClass()} min-w-[220px] whitespace-nowrap`}>
                  관리
                </th>
              </tr>
            </thead>

            <tbody>
              {!employees.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-sm font-medium text-zinc-500">
                    등록된 직원 없음
                  </td>
                </tr>
              ) : null}

              {employees.map((employee) => {
                const isSelected = selectedEmployeeId === employee.id;

                return (
                  <tr
                    key={employee.id}
                    onClick={() => onSelect(employee.id)}
                    className={`${isSelected ? "bg-orange-50" : "bg-white"} cursor-pointer hover:bg-zinc-50`}
                  >
                    <td
                      className={`${cellBaseClass()} min-w-[160px] whitespace-nowrap font-semibold text-zinc-900`}
                    >
                      {employee.name || "-"}
                    </td>
                    <td
                      className={`${cellBaseClass()} min-w-[180px] whitespace-nowrap text-zinc-700`}
                    >
                      {employee.department || "-"}
                    </td>
                    <td
                      className={`${cellBaseClass()} min-w-[180px] whitespace-nowrap text-zinc-700`}
                    >
                      {employee.position || "-"}
                    </td>
                    <td
                      className={`${cellBaseClass()} min-w-[160px] whitespace-nowrap text-zinc-700`}
                    >
                      {employee.employment_type || "-"}
                    </td>
                    <td className={`${cellBaseClass()} min-w-[220px] whitespace-nowrap`}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(employee.id);
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          수정
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(employee.id);
                          }}
                          disabled={deletingId === employee.id}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === employee.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}