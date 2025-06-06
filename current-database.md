```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.boards (
  id bigint NOT NULL DEFAULT nextval('boards_id_seq'::regclass),
  name text NOT NULL,
  description text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  is_default boolean DEFAULT false,
  icon text,
  CONSTRAINT boards_pkey PRIMARY KEY (id),
  CONSTRAINT boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.sprints (
  id bigint NOT NULL DEFAULT nextval('sprints_id_seq'::regclass),
  task_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  total_estimated_time integer NOT NULL,
  actual_time integer,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT sprints_pkey PRIMARY KEY (id),
  CONSTRAINT sprints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id bigint NOT NULL DEFAULT nextval('tasks_id_seq'::regclass),
  title text NOT NULL,
  description text,
  time_estimate integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'backlog'::text,
  position integer NOT NULL DEFAULT 0,
  scheduled_date timestamp with time zone,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  user_id uuid,
  board_id bigint,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

```
