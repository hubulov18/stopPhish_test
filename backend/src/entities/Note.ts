import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Category } from "./Category";
import { User } from "./User";

@Entity({ name: "notes" })
@Index("idx_notes_user_id", ["userId"])
@Index("idx_notes_category_id", ["categoryId"])
export class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "int", nullable: true })
  userId!: number | null;

  @Column({ type: "int", nullable: true })
  categoryId!: number | null;

  @Column({ type: "tsvector", nullable: true, select: false })
  searchVector!: string | null;

  @ManyToOne(() => User, (user) => user.notes, { onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Category, (category) => category.notes, { nullable: true, onDelete: "SET NULL" })
  category!: Category | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
