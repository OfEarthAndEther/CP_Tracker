import {
  CF_VERIFICATION_CONTEST_ID,
  CF_VERIFICATION_PROBLEM_INDEX,
  VERIFICATION_TOKEN_PREFIX,
} from './constants'

export function getCodeforcesProblemUrl(): string {
  return `https://codeforces.com/contest/${CF_VERIFICATION_CONTEST_ID}/problem/${CF_VERIFICATION_PROBLEM_INDEX}`
}

export function buildCodeforcesVerificationSnippet(token: string): string {
  return `#include <bits/stdc++.h>
using namespace std;

// Submit this exact file to ${getCodeforcesProblemUrl()}
// It must produce a compilation error containing your token.

#error ${token}

int main() {
    return 0;
}
`
}

export function getCodeforcesInstructions(token: string): {
  problemUrl: string
  snippet: string
  summary: string
} {
  return {
    problemUrl: getCodeforcesProblemUrl(),
    snippet: buildCodeforcesVerificationSnippet(token),
    summary: `Submit the snippet below to problem ${CF_VERIFICATION_CONTEST_ID}${CF_VERIFICATION_PROBLEM_INDEX}. It must fail with a compilation error referencing ${VERIFICATION_TOKEN_PREFIX}… within 5 minutes.`,
  }
}

export function getLeetCodeInstructions(token: string, handle: string): {
  profileUrl: string
  summary: string
  token: string
} {
  return {
    profileUrl: `https://leetcode.com/${handle}/`,
    summary: `Add the token below to your LeetCode bio (About Me), save, then click Verify.`,
    token,
  }
}
