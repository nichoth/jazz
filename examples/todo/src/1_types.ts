import { CoMap, CoList, AccountMigration, Profile } from "cojson";

/** Walkthrough: Defining the data model with CoJSON
 *
 *  Here, we define our main data model of tasks, lists of tasks and projects
 *  using CoJSON's collaborative map and list types, CoMap & CoList.
 *
 *  CoMap values and CoLists items can contain:
 *  - arbitrary immutable JSON
 *  - references to other CoValues by their CoID
 **/

/** An individual task which collaborators can tick or rename */
export type Task = CoMap<{ done: boolean; text: string; }>;

export type ListOfTasks = CoList<Task["id"]>;

/** Our top level object: a project with a title, referencing a list of tasks */
export type TodoProject = CoMap<{
    title: string;
    /** A collaborative, ordered list of tasks */
    tasks: ListOfTasks["id"];
}>;

export type ListOfProjects = CoList<TodoProject["id"]>;

export type TodoAccountRoot = CoMap<{
    projects: ListOfProjects["id"];
}>;

export const migration: AccountMigration<Profile, TodoAccountRoot> = (account) => {
    if (!account.get("root")) {
        account.set(
            "root",
            account.createMap<TodoAccountRoot>({
                projects: account.createList<ListOfProjects>().id,
            }).id
        );
    }
}

/** Walkthrough: Continue with ./2_main.tsx */