import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Note } from "./Note";
import { User } from "./User";

@Entity({ name: "categories" })
@Index("idx_categories_user_name", ["userId", "name"], { unique: true })
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 24, default: "#9a4f24" })
  color!: string;

  @Column({ type: "int" })
  userId!: number;

  @ManyToOne(() => User, (user) => user.categories, { onDelete: "CASCADE" })
  user!: User;

  @OneToMany(() => Note, (note) => note.category)
  notes!: Note[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
