import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: { destination: '/frbo', permanent: false },
  } as const;
};

export default function IndexRedirect() { return null; }


