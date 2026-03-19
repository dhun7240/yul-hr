import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    {
      이름: "김정규",
      주민등록번호: "900101-1234567",
      이메일: "regular@gmail.com",
      휴대폰: "010-1234-5678",
      사번: "A001",
      부서: "경영지원",
      직책: "대리",
      고용형태: "정규직",
      계약만료일: "",
      급여형태: "월급",
      기본급: 3200000,
      시급: "",
      "주 소정 근로시간": 40,
      "주 소정 근로일수": 5,
      입사일: "2026-03-01",
    },
    {
      이름: "박시급",
      주민등록번호: "950202-2345678",
      이메일: "hourly@naver.com",
      휴대폰: "010-2222-3333",
      사번: "P101",
      부서: "매장",
      직책: "스태프",
      고용형태: "아르바이트",
      계약만료일: "",
      급여형태: "시급",
      기본급: "",
      시급: 11000,
      "주 소정 근로시간": 20,
      "주 소정 근로일수": 4,
      입사일: "2026-03-05",
    },
    {
      이름: "이계약",
      주민등록번호: "980303-3456789",
      이메일: "contract@daum.net",
      휴대폰: "010-4444-5555",
      사번: "C301",
      부서: "영업",
      직책: "사원",
      고용형태: "계약직",
      계약만료일: "2026-12-31",
      급여형태: "월급",
      기본급: 2700000,
      시급: "",
      "주 소정 근로시간": 40,
      "주 소정 근로일수": 5,
      입사일: "2026-03-10",
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "직원등록템플릿");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        "직원등록템플릿.xlsx"
      )}`,
    },
  });
}